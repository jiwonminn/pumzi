import type { PatientCase } from "@/lib/types";
import { JsonPreview } from "./JsonPreview";

export function CaseSummary({ patientCase }: { patientCase: PatientCase }) {
  const presentSymptoms = Object.entries(patientCase.symptoms)
    .filter(([, value]) => value === true)
    .map(([key]) => key.replaceAll("_", " "));

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Step 4</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Ready for clinical assessment</h2>
          <p className="mt-1 text-sm text-slate-600">All intake fields have been reviewed.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-emerald-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Summary</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          {presentSymptoms.length > 0
            ? `Reported symptoms: ${presentSymptoms.join(", ")}.`
            : "No symptoms marked as present."}{" "}
          Duration: {patientCase.duration_days ?? "unknown"} day
          {patientCase.duration_days === 1 ? "" : "s"}.
        </p>
      </div>

      <button
        type="button"
        className="mt-5 w-full rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 sm:w-auto"
      >
        Continue to Assessment
      </button>
      <div className="mt-5">
        <JsonPreview patientCase={patientCase} />
      </div>
    </section>
  );
}
