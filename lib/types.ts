export type PatientCase = {
  language: "en" | "sw";
  patient: {
    age_days: number | null;
  };
  symptoms: {
    fever: boolean | null;
    cannot_drink: boolean | null;
    vomiting_everything: boolean | null;
    convulsions: boolean | null;
    lethargy: boolean | null;
  };
  duration_days: number | null;
  missing_fields: string[];
};

export type SymptomKey = keyof PatientCase["symptoms"];
