export type ClinicalFactors = {
  age_days: number | null;
  symptoms: {
    fever: boolean | null;
    cannot_drink: boolean | null;
    vomiting_everything: boolean | null;
    convulsions: boolean | null;
    convulsing_now: boolean | null;
    lethargy: boolean | null;
  };
  duration_days: number | null;
  symptom_days: {
    fever: number | null;
  };
  breaths_per_minute: number | null;
  spo2_percent: number | null;
  missing_fields: string[];
  confidence: number;
  confirmed_by_health_worker: false;
  language: "en" | "sw";
};
