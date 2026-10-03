"use client";

import { useState } from "react";
import type { PatientCase } from "@/lib/types";

export function JsonPreview({ patientCase }: { patientCase: PatientCase }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        View structured data
        <svg className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <pre className="overflow-x-auto border-t border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-200">
          {JSON.stringify(patientCase, null, 2)}
        </pre>
      )}
    </div>
  );
}
