// Default test case: every danger sign and main symptom checked and absent, already confirmed.

export function makeCase(overrides = {}) {
  const { symptoms = {}, ...rest } = overrides;
  return {
    age_days: 730,
    symptoms: {
      cannot_drink: false,
      vomiting_everything: false,
      convulsions: false,
      convulsing_now: false,
      lethargy: false,
      cough_or_difficult_breathing: false,
      diarrhoea: false,
      fever: false,
      ...symptoms,
    },
    duration_days: 1,
    breaths_per_minute: null,
    spo2_percent: null,
    missing_fields: [],
    confidence: 0.9,
    confirmed_by_health_worker: true,
    language: "sw",
    ...rest,
  };
}

export const NO_DEHYDRATION_SIGNS = {
  blood_in_stool: false,
  restless_irritable: false,
  sunken_eyes: false,
  drinking_poorly: false,
  drinks_eagerly: false,
  skin_pinch_very_slow: false,
  skin_pinch_slow: false,
};
