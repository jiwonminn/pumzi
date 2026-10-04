import type { DecisionCode, LanguageCode } from "./types";

export const TITLES: Record<DecisionCode, string> = {
  urgent_referral: "Urgent referral recommended",
  referral: "Referral",
  treat_at_clinic: "Treat at this clinic",
  home_care: "Home care",
  need_more_info: "Need more information",
  out_of_scope: "Out of scope",
  safe_fallback: "Check with the caregiver",
};

/** Sentences from the interface contract. Urgent keeps the diagram action. */
export const ACTIONS: Record<DecisionCode, string> = {
  urgent_referral: "Please go to the recommended facility.",
  referral: "Refer to a facility, not urgent.",
  treat_at_clinic: "The child needs a health worker's treatment at the clinic.",
  home_care: "No danger sign found in what was checked; when to come back.",
  need_more_info: "Ask each question, record the answer, then run the rules again.",
  out_of_scope: "This tool doesn't cover this case. See a clinician.",
  safe_fallback: "The tool isn't sure it understood. Check each sign with the caregiver and confirm.",
};

/** Same words the decision layer shows for a care need. Unknown keys stay as written. */
const CARE_NEED_LABELS: Record<string, string> = {
  pediatric_emergency: "Emergency care for children",
  oxygen: "Oxygen",
  iv_rehydration: "IV fluids",
  oral_rehydration: "Oral rehydration (ORS)",
  antibiotics: "Antibiotics",
  malaria_test: "Malaria test",
  clinician: "Clinician",
};

export const careNeedLabel = (need: string): string => CARE_NEED_LABELS[need] ?? need;

/** WHO chart wording from the contract, mapped back to symptom keys for the passport. */
export const WORDING_TO_CODE: Record<string, string> = {
  "Not able to drink or breastfeed": "cannot_drink",
  "Vomits everything": "vomiting_everything",
  "Has had convulsions": "convulsions",
  "Convulsing now": "convulsing_now",
  "Lethargic or unconscious": "lethargy",
  "Cough or difficult breathing": "cough_or_difficult_breathing",
  "Chest indrawing": "chest_indrawing",
  "Stridor in a calm child": "stridor",
  Diarrhoea: "diarrhoea",
  "Blood in the stool": "blood_in_stool",
  "Restless, irritable": "restless_irritable",
  "Sunken eyes": "sunken_eyes",
  "Drinking poorly": "drinking_poorly",
  "Drinks eagerly, thirsty": "drinks_eagerly",
  "Skin pinch goes back very slowly (longer than 2 seconds)": "skin_pinch_very_slow",
  "Skin pinch goes back slowly": "skin_pinch_slow",
  Fever: "fever",
  "Stiff neck": "stiff_neck",
};

const SW: Record<string, string> = {
  cannot_drink: "Hawezi kunywa kitu chochote",
  vomiting_everything: "Anatapika kila kitu",
  convulsions: "Ana degedege",
  convulsing_now: "Anadegedege sasa",
  lethargy: "Amedhoofika au hana fahamu",
};

export function reasonCodes(reasons: string[]): string[] {
  const codes: string[] = [];
  const known = new Set(Object.values(WORDING_TO_CODE));
  for (const reason of reasons) {
    const code = WORDING_TO_CODE[reason] ?? (known.has(reason) ? reason : null);
    if (code && !codes.includes(code)) codes.push(code);
  }
  return codes;
}

export function reasonLabel(code: string, language: LanguageCode): string {
  if (language === "sw" && SW[code]) return SW[code];
  for (const [wording, key] of Object.entries(WORDING_TO_CODE)) {
    if (key === code) return wording;
  }
  return "Ask the clinician.";
}

export function caregiverSpeech(
  decision: DecisionCode,
  codes: string[],
  reasonText: string,
  facility: string,
  language: LanguageCode,
): string {
  if (language === "en") {
    return `${TITLES[decision]} ${reasonText} ${facility}. ${ACTIONS[decision]}`;
  }
  const swReason = codes.map((code) => SW[code]).filter(Boolean).join(". ");
  const reason = swReason || reasonText;
  if (decision === "urgent_referral") {
    return `Rufaa ya haraka. Sababu: ${reason}. Nenda: ${facility}.`;
  }
  if (decision === "referral") {
    return `Rufaa. Si dharura. Sababu: ${reason}. Nenda: ${facility}.`;
  }
  if (decision === "treat_at_clinic") {
    return "Tibu katika kliniki hii. Mhudumu wa afya athibitishe.";
  }
  if (decision === "home_care") {
    return "Hakuna dalili ya hatari katika yaliyokaguliwa. Rudi ukiona dalili za hatari.";
  }
  if (decision === "need_more_info") {
    return "Bado tuna maswali. Usiwazie jibu.";
  }
  if (decision === "safe_fallback") {
    return "Chombo hakina uhakika. Angalia kila dalili na mtoa huduma, kisha thibitisha.";
  }
  return "Chombo hiki hakihusu kesi hii. Muone mhudumu wa afya.";
}

export function smsBody(speech: string, language: LanguageCode, passportId: string): string {
  if (language === "sw") {
    return `Pumzi: ${speech} Namba: ${passportId}. Hii si utambuzi wa ugonjwa.`;
  }
  return `Pumzi: ${speech} ID: ${passportId}. This is not a diagnosis.`;
}

/** Phone composer link. Null when the number is missing or not dialable. */
export function smsComposerHref(phone: string, body: string): string | null {
  const compact = phone.replace(/[\s()-]/g, "");
  if (!/^\+?[0-9]{7,15}$/.test(compact)) return null;
  return `sms:${compact}?&body=${encodeURIComponent(body)}`;
}
