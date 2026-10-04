"use client";

import { useState } from "react";
import type { ClinicalFactors } from "@/lib/clinicalFactors";

const labels: Record<keyof ClinicalFactors["symptoms"], string> = {
  fever: "Fever",
  cannot_drink: "Unable to drink",
  vomiting_everything: "Vomiting everything",
  convulsions: "Convulsions",
  convulsing_now: "Convulsing now",
  lethargy: "Lethargy",
};

export function ClinicalFactorsCard({ factors }: { factors: ClinicalFactors }) {
  const [showJson, setShowJson] = useState(false);

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
        Local backend result
      </p>
      <h2 className="mt-1 text-xl font-bold text-slate-900">
        Extracted clinical factors
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Facts extracted locally. No diagnosis or clinical recommendation was made.
      </p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Age</p>
          <p className="mt-1 font-semibold text-slate-800">
            {factors.age_days === null ? "Unknown" : `${factors.age_days} days`}
          </p>
        </div>
        <div className="rounded-xl bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Duration</p>
          <p className="mt-1 font-semibold text-slate-800">
            {factors.duration_days === null ? "Unknown" : `${factors.duration_days} days`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {Object.entries(factors.symptoms).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between rounded-xl border border-indigo-100 bg-white px-4 py-3">
            <span className="text-sm font-medium text-slate-700">
              {labels[key as keyof ClinicalFactors["symptoms"]]}
            </span>
            <span className={`text-xs font-bold ${value === true ? "text-emerald-700" : value === false ? "text-slate-500" : "text-amber-700"}`}>
              {value === true ? "Present" : value === false ? "Absent" : "Unknown"}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-5 text-sm text-slate-700">
        Confidence: <strong>{Math.round(factors.confidence * 100)}%</strong>
      </p>

      <div className="mt-5 overflow-hidden rounded-xl border border-indigo-200">
        <button
          type="button"
          onClick={() => setShowJson((open) => !open)}
          aria-expanded={showJson}
          className="flex w-full justify-between bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50"
        >
          View raw JSON
          <span aria-hidden="true">{showJson ? "−" : "+"}</span>
        </button>
        {showJson && (
          <pre className="overflow-x-auto border-t border-indigo-200 bg-slate-950 p-4 text-xs leading-6 text-slate-200">
            {JSON.stringify(factors, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
}
