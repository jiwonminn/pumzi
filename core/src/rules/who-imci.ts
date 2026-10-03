// WHO IMCI danger-sign rules for a sick child aged 2 months up to 5 years.
// Source: WHO Integrated Management of Childhood Illness (IMCI) Chart Booklet, March 2014, PDF pages 5 to 8.
// Every quote is copied word for word from the booklet; core/test/quotes.test.mjs checks this.
//
// Each rule answers true (applies), false (does not apply) or null (can't tell yet).
// Unknown is never treated as "no": a rule that could still fire returns null, and the
// engine asks the follow-up question instead of guessing.

import type { MainSymptom, Protocol, Rule, StructuredCase, SymptomKey, Tri } from "../types";

export const IMCI_SOURCE = "WHO IMCI Chart Booklet (2014)";

/** Age scope of this chart, in days: 2 months up to (not including) 5 years. */
export const IMCI_AGE_MIN_DAYS = 60;
export const IMCI_AGE_MAX_DAYS_EXCLUSIVE = 1826;

/** Quote for the age scope, used when a case is out of scope. */
export const IMCI_SCOPE_QUOTE = "SICK CHILD AGE 2 MONTHS UP TO 5 YEARS";

/** Plain-language labels, used for reasons and follow-up questions. */
export const SYMPTOM_LABELS: Record<SymptomKey, string> = {
  cannot_drink: "Not able to drink or breastfeed",
  vomiting_everything: "Vomits everything",
  convulsions: "Has had convulsions",
  convulsing_now: "Convulsing now",
  lethargy: "Lethargic or unconscious",
  cough_or_difficult_breathing: "Cough or difficult breathing",
  chest_indrawing: "Chest indrawing",
  stridor: "Stridor in a calm child",
  diarrhoea: "Diarrhoea",
  blood_in_stool: "Blood in the stool",
  restless_irritable: "Restless, irritable",
  sunken_eyes: "Sunken eyes",
  drinking_poorly: "Drinking poorly",
  drinks_eagerly: "Drinks eagerly, thirsty",
  skin_pinch_very_slow: "Skin pinch goes back very slowly",
  skin_pinch_slow: "Skin pinch goes back slowly",
  fever: "Fever",
  stiff_neck: "Stiff neck",
};

// ---------- three-valued helpers ----------

const sign = (c: StructuredCase, key: SymptomKey): Tri => c.symptoms[key] ?? null;

/** true if any is true, false if all are false, otherwise null. */
const anyOf = (...values: Tri[]): Tri =>
  values.some((v) => v === true) ? true : values.every((v) => v === false) ? false : null;

/** false if any is false, true if all are true, otherwise null. */
const allOf = (...values: Tri[]): Tri =>
  values.some((v) => v === false) ? false : values.every((v) => v === true) ? true : null;

const not = (v: Tri): Tri => (v === null ? null : !v);

/** "Two of the following signs": decided only when the unknowns can't change the answer. */
const twoOf = (...values: Tri[]): Tri => {
  const yes = values.filter((v) => v === true).length;
  const unknown = values.filter((v) => v === null).length;
  if (yes >= 2) return true;
  if (yes + unknown < 2) return false;
  return null;
};

/** A rule inside a main-symptom box applies only when that symptom is present. */
const within = (present: Tri, inner: Tri): Tri => {
  if (present === false) return false;
  if (present === true) return inner;
  return inner === false ? false : null;
};

/** Days with this main symptom; falls back to duration_days when it's the only main symptom. */
export const daysOf = (c: StructuredCase, symptom: MainSymptom): number | null => {
  const own = c.symptom_days?.[symptom];
  if (own !== undefined && own !== null) return own;
  const main: Tri[] = [
    sign(c, "cough_or_difficult_breathing"),
    sign(c, "diarrhoea"),
    sign(c, "fever"),
  ];
  const presentCount = main.filter((v) => v === true).length;
  return presentCount === 1 ? c.duration_days : null;
};

const atLeast = (value: number | null, threshold: number): Tri =>
  value === null ? null : value >= threshold;

const moreThan = (value: number | null, threshold: number): Tri =>
  value === null ? null : value > threshold;

/** Fast breathing (PDF page 6): 50+ per minute from 2 up to 12 months, 40+ from 12 months up to 5 years. */
export const fastBreathingThreshold = (ageDays: number): number => (ageDays < 365 ? 50 : 40);

const fastBreathing = (c: StructuredCase): Tri => {
  const bpm = c.breaths_per_minute ?? null;
  if (bpm === null || c.age_days === null) return null;
  return bpm >= fastBreathingThreshold(c.age_days);
};

// ---------- the classifications ----------

const generalDangerSign = (c: StructuredCase): Tri =>
  anyOf(
    sign(c, "cannot_drink"),
    sign(c, "vomiting_everything"),
    sign(c, "convulsions"),
    sign(c, "convulsing_now"),
    sign(c, "lethargy"),
  );

const severeDehydration = (c: StructuredCase): Tri =>
  within(
    sign(c, "diarrhoea"),
    twoOf(
      sign(c, "lethargy"),
      sign(c, "sunken_eyes"),
      anyOf(sign(c, "cannot_drink"), sign(c, "drinking_poorly")),
      sign(c, "skin_pinch_very_slow"),
    ),
  );

const someDehydration = (c: StructuredCase): Tri =>
  within(
    sign(c, "diarrhoea"),
    twoOf(
      sign(c, "restless_irritable"),
      sign(c, "sunken_eyes"),
      sign(c, "drinks_eagerly"),
      sign(c, "skin_pinch_slow"),
    ),
  );

const anyDehydration = (c: StructuredCase): Tri => anyOf(severeDehydration(c), someDehydration(c));

const pneumonia = (c: StructuredCase): Tri =>
  within(sign(c, "cough_or_difficult_breathing"), anyOf(sign(c, "chest_indrawing"), fastBreathing(c)));

const stridorInCalmChild = (c: StructuredCase): Tri => {
  const stridor = sign(c, "stridor");
  if (stridor !== null) return stridor;
  return sign(c, "cough_or_difficult_breathing") === false ? false : null;
};

const DANGER_SIGN_FIELDS = ["cannot_drink", "vomiting_everything", "convulsions", "convulsing_now", "lethargy"];

export const IMCI_RULES: Rule[] = [
  // ----- General danger signs (PDF page 5) -----
  {
    id: "IMCI-GDS-01",
    classification: "VERY SEVERE DISEASE",
    colour: "pink",
    decision: "urgent_referral",
    required_care: ["pediatric_emergency"],
    quote:
      "A child with any general danger sign needs URGENT attention; complete the assessment and any pre-referral treatment immediately so referral is not delayed.",
    source: IMCI_SOURCE,
    pdf_page: 5,
    needs: DANGER_SIGN_FIELDS,
    applies: generalDangerSign,
  },

  // ----- Cough or difficult breathing (PDF page 6) -----
  {
    id: "IMCI-COUGH-01",
    classification: "SEVERE PNEUMONIA OR VERY SEVERE DISEASE",
    colour: "pink",
    decision: "urgent_referral",
    required_care: ["pediatric_emergency", "oxygen"],
    quote: "Any general danger sign or Stridor in calm child.",
    source: IMCI_SOURCE,
    pdf_page: 6,
    needs: ["cough_or_difficult_breathing", "stridor"],
    applies: stridorInCalmChild,
  },
  {
    id: "IMCI-COUGH-02",
    classification: "LOW OXYGEN SATURATION",
    colour: "pink",
    decision: "urgent_referral",
    required_care: ["pediatric_emergency", "oxygen"],
    quote: "*If pulse oximeter is available, determine oxygen saturation and refer if < 90%.",
    source: IMCI_SOURCE,
    pdf_page: 6,
    // Only when a pulse oximeter is available, so a missing reading never blocks the decision.
    needs: [],
    applies: (c) => (c.spo2_percent == null ? false : c.spo2_percent < 90),
    explain: (c) => [`Oxygen saturation ${c.spo2_percent}% (below 90%)`],
  },
  {
    id: "IMCI-COUGH-03",
    classification: "PNEUMONIA",
    colour: "yellow",
    decision: "treat_at_clinic",
    required_care: ["antibiotics"],
    quote: "Chest indrawing or Fast breathing.",
    source: IMCI_SOURCE,
    pdf_page: 6,
    needs: ["cough_or_difficult_breathing", "breaths_per_minute", "chest_indrawing"],
    applies: pneumonia,
    explain: (c) => {
      const reasons: string[] = [];
      if (sign(c, "chest_indrawing") === true) reasons.push(SYMPTOM_LABELS.chest_indrawing);
      if (fastBreathing(c) === true && c.age_days !== null) {
        reasons.push(
          `Fast breathing: ${c.breaths_per_minute} breaths per minute (fast is ${fastBreathingThreshold(c.age_days)} or more at this age)`,
        );
      }
      return reasons;
    },
    note: "If chest indrawing in HIV exposed/infected child, give first dose of amoxicillin and refer.",
  },
  {
    id: "IMCI-COUGH-04",
    classification: "COUGH FOR MORE THAN 14 DAYS",
    colour: "yellow",
    decision: "referral",
    required_care: ["clinician"],
    quote:
      "If coughing for more than 14 days or recurrent wheeze, refer for possible TB or asthma assessment",
    source: IMCI_SOURCE,
    pdf_page: 6,
    needs: ["cough_or_difficult_breathing", "symptom_days.cough"],
    applies: (c) => within(sign(c, "cough_or_difficult_breathing"), moreThan(daysOf(c, "cough"), 14)),
    explain: (c) => [`Cough for ${daysOf(c, "cough")} days`],
  },
  {
    id: "IMCI-COUGH-05",
    classification: "COUGH OR COLD",
    colour: "green",
    decision: "home_care",
    required_care: [],
    quote: "No signs of pneumonia or very severe disease.",
    source: IMCI_SOURCE,
    pdf_page: 6,
    needs: [],
    applies: (c) =>
      within(
        sign(c, "cough_or_difficult_breathing"),
        allOf(not(generalDangerSign(c)), not(stridorInCalmChild(c)), not(pneumonia(c))),
      ),
  },

  // ----- Diarrhoea (PDF page 7) -----
  {
    id: "IMCI-DIARR-01",
    classification: "SEVERE DEHYDRATION",
    colour: "pink",
    decision: "urgent_referral",
    required_care: ["iv_rehydration"],
    quote:
      "Two of the following signs: Lethargic or unconscious Sunken eyes Not able to drink or drinking poorly Skin pinch goes back very slowly.",
    source: IMCI_SOURCE,
    pdf_page: 7,
    needs: ["diarrhoea", "lethargy", "sunken_eyes", "drinking_poorly", "skin_pinch_very_slow"],
    applies: severeDehydration,
  },
  {
    id: "IMCI-DIARR-02",
    classification: "SEVERE PERSISTENT DIARRHOEA",
    colour: "pink",
    decision: "referral",
    required_care: ["clinician", "oral_rehydration"],
    quote:
      "Treat dehydration before referral unless the child has another severe classification",
    source: IMCI_SOURCE,
    pdf_page: 7,
    needs: ["diarrhoea", "symptom_days.diarrhoea"],
    applies: (c) =>
      within(sign(c, "diarrhoea"), allOf(atLeast(daysOf(c, "diarrhoea"), 14), anyDehydration(c))),
  },
  {
    id: "IMCI-DIARR-03",
    classification: "SOME DEHYDRATION",
    colour: "yellow",
    decision: "treat_at_clinic",
    required_care: ["oral_rehydration"],
    quote:
      "Two of the following signs: Restless, irritable Sunken eyes Drinks eagerly, thirsty Skin pinch goes back slowly.",
    source: IMCI_SOURCE,
    pdf_page: 7,
    needs: ["diarrhoea", "restless_irritable", "sunken_eyes", "drinks_eagerly", "skin_pinch_slow"],
    applies: someDehydration,
  },
  {
    id: "IMCI-DIARR-04",
    classification: "PERSISTENT DIARRHOEA",
    colour: "yellow",
    decision: "treat_at_clinic",
    required_care: ["clinician"],
    quote: "Advise the mother on feeding a child who has PERSISTENT DIARRHOEA",
    source: IMCI_SOURCE,
    pdf_page: 7,
    needs: ["diarrhoea", "symptom_days.diarrhoea"],
    applies: (c) =>
      within(sign(c, "diarrhoea"), allOf(atLeast(daysOf(c, "diarrhoea"), 14), not(anyDehydration(c)))),
  },
  {
    id: "IMCI-DIARR-05",
    classification: "DYSENTERY",
    colour: "yellow",
    decision: "treat_at_clinic",
    required_care: ["antibiotics"],
    quote: "Give ciprofloxacin for 3 days",
    source: IMCI_SOURCE,
    pdf_page: 7,
    needs: ["diarrhoea", "blood_in_stool"],
    applies: (c) => within(sign(c, "diarrhoea"), sign(c, "blood_in_stool")),
  },
  {
    id: "IMCI-DIARR-06",
    classification: "NO DEHYDRATION",
    colour: "green",
    decision: "home_care",
    required_care: [],
    quote: "Not enough signs to classify as some or severe dehydration.",
    source: IMCI_SOURCE,
    pdf_page: 7,
    needs: [],
    applies: (c) => within(sign(c, "diarrhoea"), not(anyDehydration(c))),
  },

  // ----- Fever (PDF page 8) -----
  {
    id: "IMCI-FEVER-01",
    classification: "VERY SEVERE FEBRILE DISEASE",
    colour: "pink",
    decision: "urgent_referral",
    required_care: ["pediatric_emergency"],
    quote: "Look or feel for stiff neck.",
    source: IMCI_SOURCE,
    pdf_page: 8,
    needs: ["fever", "stiff_neck"],
    applies: (c) => within(sign(c, "fever"), sign(c, "stiff_neck")),
  },
  {
    id: "IMCI-FEVER-02",
    classification: "PROLONGED FEVER",
    colour: "yellow",
    decision: "referral",
    required_care: ["clinician"],
    quote: "If fever is present every day for more than 7 days, refer",
    source: IMCI_SOURCE,
    pdf_page: 8,
    needs: ["fever", "symptom_days.fever"],
    applies: (c) => within(sign(c, "fever"), moreThan(daysOf(c, "fever"), 7)),
    explain: (c) => [`Fever for ${daysOf(c, "fever")} days`],
  },
  {
    id: "IMCI-FEVER-03",
    classification: "FEVER: MALARIA TEST NEEDED",
    colour: "yellow",
    decision: "treat_at_clinic",
    required_care: ["malaria_test"],
    quote: "Do a malaria test***: If NO severe classification In all fever cases if High malaria risk.",
    source: IMCI_SOURCE,
    pdf_page: 8,
    needs: ["fever", "stiff_neck"],
    // Only when there is no severe classification: a very severe febrile disease is referred, not tested here.
    applies: (c) =>
      within(sign(c, "fever"), allOf(not(sign(c, "stiff_neck")), not(generalDangerSign(c)))),
  },
];

/** Follow-up questions, in the order the WHO chart asks them (PDF pages 5 to 8). */
const IMCI_QUESTIONS: Record<string, string> = {
  age_days: "How old is the child?",
  cannot_drink: "Is the child able to drink or breastfeed?",
  vomiting_everything: "Does the child vomit everything?",
  convulsions: "Has the child had convulsions?",
  convulsing_now: "Is the child convulsing now?",
  lethargy: "See if the child is lethargic or unconscious.",
  cough_or_difficult_breathing: "Does the child have cough or difficult breathing?",
  "symptom_days.cough": "For how long has the child had cough or difficult breathing?",
  breaths_per_minute: "Count the breaths in one minute. The child must be calm.",
  chest_indrawing: "Look for chest indrawing.",
  stridor: "Look and listen for stridor. The child must be calm.",
  diarrhoea: "Does the child have diarrhoea?",
  "symptom_days.diarrhoea": "For how long has the child had diarrhoea?",
  blood_in_stool: "Is there blood in the stool?",
  restless_irritable: "Is the child restless and irritable?",
  sunken_eyes: "Look for sunken eyes.",
  drinking_poorly: "Offer the child fluid. Is the child not able to drink or drinking poorly?",
  drinks_eagerly: "Offer the child fluid. Is the child drinking eagerly, thirsty?",
  skin_pinch_very_slow: "Pinch the skin of the abdomen. Does it go back very slowly (longer than 2 seconds)?",
  skin_pinch_slow: "Pinch the skin of the abdomen. Does it go back slowly?",
  fever: "Does the child have fever?",
  "symptom_days.fever": "For how long has the child had fever?",
  stiff_neck: "Look or feel for stiff neck.",
};

/** Fields that only matter once their main symptom is known to be present. */
const IMCI_GATES: Record<string, string[]> = {
  cough_or_difficult_breathing: ["symptom_days.cough", "breaths_per_minute", "chest_indrawing", "stridor"],
  diarrhoea: [
    "symptom_days.diarrhoea",
    "blood_in_stool",
    "restless_irritable",
    "sunken_eyes",
    "drinking_poorly",
    "drinks_eagerly",
    "skin_pinch_very_slow",
    "skin_pinch_slow",
  ],
  fever: ["symptom_days.fever", "stiff_neck"],
};

const isKnown = (c: StructuredCase, field: string): boolean => {
  if (field === "age_days") return c.age_days !== null;
  if (field === "breaths_per_minute") return (c.breaths_per_minute ?? null) !== null;
  if (field.startsWith("symptom_days.")) {
    return daysOf(c, field.slice("symptom_days.".length) as MainSymptom) !== null;
  }
  return sign(c, field as SymptomKey) !== null;
};

export const IMCI_PROTOCOL: Protocol = {
  name: "WHO IMCI: sick child age 2 months up to 5 years",
  source: IMCI_SOURCE,
  age_scope: {
    min_days: IMCI_AGE_MIN_DAYS,
    max_days_exclusive: IMCI_AGE_MAX_DAYS_EXCLUSIVE,
    quote: IMCI_SCOPE_QUOTE,
    pdf_page: 5,
  },
  rules: IMCI_RULES,
  labels: SYMPTOM_LABELS,
  questions: IMCI_QUESTIONS,
  gates: IMCI_GATES,
  known: isKnown,
};
