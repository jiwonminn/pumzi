import type { PatientCase } from "./types";

type MockExtractionInput = {
  age: string;
  language: PatientCase["language"];
  description: string;
};

export function mockExtractSymptoms({
  age,
  language,
}: MockExtractionInput): Promise<PatientCase> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      const ageInYears = Number(age);

      resolve({
        language,
        patient: {
          age_days:
            Number.isFinite(ageInYears) && ageInYears >= 0
              ? Math.round(ageInYears * 365)
              : 730,
        },
        symptoms: {
          fever: true,
          cannot_drink: true,
          vomiting_everything: false,
          convulsions: false,
          lethargy: null,
        },
        duration_days: 1,
        missing_fields: ["lethargy"],
      });
    }, 800);
  });
}
