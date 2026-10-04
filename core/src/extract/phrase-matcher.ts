// Browser fallback for when the local AI backend isn't running. Matches known phrases
// to the contract's symptom keys. No model, so it can't invent a symptom or a number:
// anything it doesn't recognise stays null and the engine asks a follow-up.
//
// Swahili phrases are a first draft and still need checking by a Swahili speaker.

import type { StructuredCase, SymptomKey } from "../types";

export type Evidence = { field: string; phrase: string; value: boolean | number };

export type ExtractOptions = {
  language: "sw" | "en";
  // From the intake form's age box, if it has one. Wins over anything found in the text.
  ageDays?: number | null;
};

type Patterns = { present: RegExp[]; absent?: RegExp[] };

const SYMPTOM_PATTERNS: Partial<Record<SymptomKey, Patterns>> = {
  cannot_drink: {
    present: [
      /\b(can ?not|can't|cant|unable to|not able to|won't|wont|refuses? to|isn't|is not) (drink|breastfeed|breast feed|feed)\w*\b(?! (much|well|enough))/,
      /\bnot (drinking|breastfeeding|feeding)\b(?! (much|well|enough))/,
      /\b(hawezi|anashindwa) (kunywa|kunyonya)\b/,
      /\bhanywi\b/,
    ],
    absent: [/\b(drinking|drinks|breastfeeding|feeding) (well|normally|fine)\b/],
  },
  vomiting_everything: {
    present: [
      /\b(vomit|vomits|vomiting|throws up|throwing up) (everything|all)\b/,
      /\b(can't|cannot|can not) keep anything down\b/,
      /\b(anatapika|hutapika|kutapika) kila (kitu|kitu anachokula)\b/,
    ],
  },
  convulsions: {
    present: [/\b(convulsion|convulsions|seizure|seizures|fits|had a fit|having a fit|fitting)\b/, /\bdegedege\b/],
  },
  convulsing_now: {
    present: [/\b(convulsing|seizing|fitting|having a (seizure|fit)) (now|right now)\b/, /\bana degedege sasa\b/],
  },
  lethargy: {
    present: [
      /\b(lethargic|unconscious|unresponsive|not responding|hard to wake|won't wake|wont wake|very sleepy|floppy)\b/,
      /\b(amelegea|hajitambui|amepoteza fahamu)\b/,
    ],
  },
  cough_or_difficult_breathing: {
    present: [
      /\b(cough|coughing|coughs)\b/,
      /\b(difficult|difficulty|trouble|struggling|hard) (breathing|to breathe)\b/,
      /\b(breathing (fast|quickly|rapidly)|fast breathing|short of breath)\b/,
      /\b(kikohozi|anakohoa)\b/,
      /\b(anapumua haraka|shida ya kupumua|anashindwa kupumua)\b/,
    ],
  },
  chest_indrawing: {
    present: [/\b(chest indrawing|chest (pulls|sucks|draws) in|ribs (pull|suck) in)\b/],
  },
  stridor: {
    present: [/\b(stridor|noisy breathing)\b/],
  },
  diarrhoea: {
    present: [/\b(diarrhoea|diarrhea|loose (stool|stools)|watery (stool|stools))\b/, /\b(kuhara|kuharisha|anaharisha)\b/],
  },
  blood_in_stool: {
    present: [
      /\b(blood in (the )?(stool|stools|poo)|bloody (stool|stools|diarrhoea|diarrhea))\b/,
      /\b(damu (kwenye|katika) kinyesi|kinyesi (chenye|cha) damu)\b/,
    ],
  },
  restless_irritable: {
    present: [/\b(restless|irritable)\b/],
  },
  sunken_eyes: {
    present: [/\b(sunken eyes|eyes (are |look |looked )?sunken)\b/, /\bmacho yamezama\b/],
  },
  drinking_poorly: {
    present: [/\b(drinking poorly|drinks poorly|barely drinking|hardly drinking|not drinking (much|enough))\b/],
  },
  drinks_eagerly: {
    present: [/\b(drinks eagerly|drinking eagerly|very thirsty|really thirsty)\b/, /\bana kiu sana\b/],
  },
  fever: {
    present: [/\b(fever|feverish|high temperature|feels hot|burning up)\b/, /\bhoma\b/],
  },
  stiff_neck: {
    present: [/\b(stiff neck|neck is stiff|neck stiffness)\b/, /\b(shingo ngumu|shingo imekakamaa)\b/],
  },
};

export const DANGER_SIGNS: SymptomKey[] = ["cannot_drink", "vomiting_everything", "convulsions", "lethargy"];

// Negation has to come just before the phrase, inside the same clause.
const NEGATION_BEFORE = /\b(no|not|never|without|denies|doesn't have|does not have|hasn't had|has not had|hasn't|has not|isn't|is not|hana|hakuna|bila)\b(\s+\w+){0,3}\s*$/;

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  moja: 1, mmoja: 1, mbili: 2, miwili: 2, wawili: 2, tatu: 3, mitatu: 3, nne: 4, minne: 4, tano: 5, mitano: 5,
  sita: 6, saba: 7, nane: 8, tisa: 9, kumi: 10,
};

const toNumber = (token: string): number | null => {
  const n = Number(token);
  if (Number.isFinite(n)) return n;
  return WORD_NUMBERS[token] ?? null;
};

const normalise = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9%'.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const clausesOf = (text: string): string[] =>
  text.split(/[.;!?]|\bbut\b|\blakini\b/).map((c) => c.trim()).filter(Boolean);

function findAge(text: string, evidence: Evidence[]): number | null {
  const patterns: [RegExp, number][] = [
    [/\b(\d+(?:\.\d+)?|[a-z]+)[\s-]*(?:years?|yrs?)(?:[\s-]*old)?\b/, 365],
    [/\b(\d+|[a-z]+)[\s-]*months?(?:[\s-]*old)?\b/, 30.4],
    [/\b(\d+|[a-z]+)[\s-]*weeks?(?:[\s-]*old)?\b/, 7],
    [/\bmiaka (\w+)\b/, 365],
    [/\bmiezi (\w+)\b/, 30.4],
  ];
  for (const [pattern, daysPerUnit] of patterns) {
    const m = text.match(pattern);
    const n = m ? toNumber(m[1]) : null;
    if (m && n !== null) {
      const days = Math.round(n * daysPerUnit);
      evidence.push({ field: "age_days", phrase: m[0], value: days });
      return days;
    }
  }
  return null;
}

function findDuration(text: string, evidence: Evidence[]): number | null {
  const yesterday = text.match(/\b(since yesterday|tangu jana)\b/);
  if (yesterday) {
    evidence.push({ field: "duration_days", phrase: yesterday[0], value: 1 });
    return 1;
  }
  const days = text.match(/\b(?:for |since )?(\d+|[a-z]+) days?\b/) ?? text.match(/\bsiku (\w+)\b/);
  const n = days ? toNumber(days[1]) : null;
  if (days && n !== null) {
    evidence.push({ field: "duration_days", phrase: days[0], value: n });
    return n;
  }
  const hours = text.match(/\b(\d+) hours?\b/);
  if (hours) {
    const d = Math.max(1, Math.round(Number(hours[1]) / 24));
    evidence.push({ field: "duration_days", phrase: hours[0], value: d });
    return d;
  }
  return null;
}

// Numbers only count when the text states them next to what they measure.
function findBreaths(text: string, evidence: Evidence[]): number | null {
  const m =
    text.match(/\b(\d{2,3}) (?:breaths?|breathing)\b/) ??
    text.match(/\b(?:breathing|respiratory rate|resp rate|rr)(?: rate)?(?: of| at| is)? (\d{2,3})\b/);
  if (!m) return null;
  const n = Number(m[1]);
  evidence.push({ field: "breaths_per_minute", phrase: m[0], value: n });
  return n;
}

function findSpo2(text: string, evidence: Evidence[]): number | null {
  const m =
    text.match(/\b(?:spo2|oxygen|o2 sat|o2|saturation|sats)(?: level| saturation)?(?: of| at| is)? (\d{2,3}) ?%?/) ??
    text.match(/\b(\d{2,3}) ?% (?:oxygen|spo2|saturation)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  evidence.push({ field: "spo2_percent", phrase: m[0], value: n });
  return n;
}

function findSymptoms(text: string, evidence: Evidence[]): Partial<Record<SymptomKey, boolean>> {
  const found: Partial<Record<SymptomKey, boolean>> = {};
  for (const clause of clausesOf(text)) {
    for (const [key, patterns] of Object.entries(SYMPTOM_PATTERNS) as [SymptomKey, Patterns][]) {
      for (const pattern of patterns.absent ?? []) {
        const m = clause.match(pattern);
        if (m && found[key] === undefined) {
          found[key] = false;
          evidence.push({ field: key, phrase: m[0], value: false });
        }
      }
      for (const pattern of patterns.present) {
        const m = clause.match(pattern);
        if (!m || m.index === undefined) continue;
        const negated = NEGATION_BEFORE.test(clause.slice(0, m.index));
        // A positive mention beats a negated one if both appear.
        if (found[key] !== true) {
          found[key] = !negated;
          evidence.push({ field: key, phrase: m[0], value: !negated });
        }
      }
    }
  }
  // "Convulsing now" also means "has had convulsions".
  if (found.convulsing_now === true) found.convulsions = true;
  return found;
}

export function extractCaseWithEvidence(rawText: string, options: ExtractOptions): { case: StructuredCase; evidence: Evidence[] } {
  const text = normalise(rawText);
  const evidence: Evidence[] = [];

  const symptoms = findSymptoms(text, evidence);
  const age = options.ageDays ?? findAge(text, evidence);
  const duration = findDuration(text, evidence);
  const breaths = findBreaths(text, evidence);
  const spo2 = findSpo2(text, evidence);

  const matched = Object.keys(symptoms).length;
  const result: StructuredCase = {
    age_days: age,
    symptoms,
    duration_days: duration,
    breaths_per_minute: breaths,
    spo2_percent: spo2,
    missing_fields: DANGER_SIGNS.filter((k) => symptoms[k] === undefined),
    // Deliberately modest: the health worker confirms either way.
    confidence: matched > 0 ? 0.6 : 0.2,
    confirmed_by_health_worker: false,
    language: options.language,
  };
  return { case: result, evidence };
}

export const extractCase = (text: string, options: ExtractOptions): StructuredCase =>
  extractCaseWithEvidence(text, options).case;
