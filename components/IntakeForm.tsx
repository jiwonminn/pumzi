"use client";

import { useState } from "react";
import type { ClinicalFactors } from "@/lib/clinicalFactors";
import { processPatient } from "@/lib/api/processPatient";
import type { PatientCase } from "@/lib/types";
import { ClinicalFactorsCard } from "./ClinicalFactorsCard";

export function IntakeForm() {
  const [language, setLanguage] = useState<PatientCase["language"]>("en");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [translation, setTranslation] = useState("");
  const [clinicalFactors, setClinicalFactors] = useState<ClinicalFactors | null>(null);
  const [processStatus, setProcessStatus] = useState<"idle" | "processing" | "complete" | "failed">("idle");
  const [processError, setProcessError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await handleProcess();
  }

  async function handleProcess() {
    const text = description.trim();
    if (!text) {
      return;
    }

    setProcessStatus("processing");
    setProcessError("");
    setTranslation("");
    setClinicalFactors(null);

    try {
      const result = await processPatient(text, language);
      setTranslation(result.translated_text ?? "");
      setClinicalFactors(result.clinical_factors);
      setProcessStatus("complete");
    } catch (error) {
      setProcessStatus("failed");
      setProcessError(
        error instanceof Error
          ? error.message
          : "Local AI service failed to process this input.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-600">Step 1</p>
            <h2 className="text-xl font-bold text-slate-900">Start a new intake</h2>
            <p className="mt-1 text-sm text-slate-500">Capture the caregiver&apos;s description in their own words.</p>
          </div>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 sm:inline-flex">Offline ready</span>
        </div>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_180px]">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Describe the child&apos;s symptoms</span>
            <textarea
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={7}
              placeholder="My child is 2 years old, has had a fever since yesterday, and cannot drink."
              className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-base leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />
            {language === "sw" && translation && (
              <div className="mt-3">
                <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">English Translation</p>
                  <p className="mt-2 text-base leading-7 text-slate-800">{translation}</p>
                </div>
              </div>
            )}
            <div className="mt-4">
              <button
                type="button"
                onClick={handleProcess}
                disabled={!description.trim() || processStatus === "processing"}
                className="rounded-xl border border-indigo-700 bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {processStatus === "processing" ? "Processing locally..." : "Process Locally"}
              </button>
              {processStatus === "complete" && <p className="mt-2 text-sm font-medium text-emerald-700">Processing complete</p>}
              {processStatus === "failed" && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{processError}</p>}
            </div>
          </label>
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Patient age</span>
              <div className="relative">
                <input
                  required
                  min="0"
                  max="18"
                  type="number"
                  value={age}
                  onChange={(event) => setAge(event.target.value)}
                  placeholder="2"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-16 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-400">years</span>
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Description language</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as PatientCase["language"])}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-5">
          <button
            type="submit"
          disabled={processStatus === "processing"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-wait disabled:bg-teal-500 sm:w-auto"
          >
            {processStatus === "processing" && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {processStatus === "processing" ? "Processing locally..." : "Analyze Symptoms"}
          </button>
        </div>
      </form>

      {clinicalFactors && <ClinicalFactorsCard factors={clinicalFactors} />}
    </div>
  );
}
