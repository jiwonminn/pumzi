import type { PatientCase } from "@/lib/types";
import { SymptomStatus } from "./SymptomStatus";

const symptomLabels: Record<keyof PatientCase["symptoms"], string> = {
  fever: "Fever",
  cannot_drink: "Unable to drink",
  vomiting_everything: "Vomiting everything",
  convulsions: "Convulsions",
  lethargy: "Unusually sleepy or difficult to wake",
};

type ExtractionReviewProps = {
  patientCase: PatientCase;
};

export function ExtractionReview({ patientCase }: ExtractionReviewProps) {
  const ageYears =
    patientCase.patient.age_days === null
      ? "Not recorded"
      : `${Math.floor(patientCase.patient.age_days / 365)} years`;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-600">
            Step 2
          </p>
          <h2 className="text-xl font-bold text-slate-900">Extraction review</h2>
          <p className="mt-1 text-sm text-slate-500">
            Check the details we found in the caregiver&apos;s description.
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          Mock result
        </span>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Patient age
          </p>
          <p className="mt-1 font-semibold text-slate-800">{ageYears}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Symptom duration
          </p>
          <p className="mt-1 font-semibold text-slate-800">
            {patientCase.duration_days === null
              ? "Not recorded"
              : `${patientCase.duration_days} day${patientCase.duration_days === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-slate-800">Detected symptoms</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(patientCase.symptoms).map(([key, value]) => (
            <SymptomStatus
              key={key}
              label={symptomLabels[key as keyof PatientCase["symptoms"]]}
              value={value}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
