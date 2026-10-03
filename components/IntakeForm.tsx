"use client";

import { useState } from "react";
import type { PatientCase } from "@/lib/types";
import { mockExtractSymptoms } from "@/lib/mockExtractor";
import {
  isTranslatorLoaded,
  loadTranslator,
  translateSwahiliToEnglish,
} from "@/lib/translator";
import { CaseSummary } from "./CaseSummary";
import { ExtractionReview } from "./ExtractionReview";
import { FollowUpQuestion } from "./FollowUpQuestion";

export function IntakeForm() {
  const [language, setLanguage] = useState<PatientCase["language"]>("en");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [patientCase, setPatientCase] = useState<PatientCase | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [translation, setTranslation] = useState("");
  const [translationStatus, setTranslationStatus] = useState<
    "idle" | "loading" | "translating" | "complete" | "failed"
  >("idle");
  const [translationError, setTranslationError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsAnalyzing(true);
    setPatientCase(null);
    const result = await mockExtractSymptoms({ age, language, description });
    setPatientCase(result);
    setIsAnalyzing(false);
  }

  async function handleTranslation() {
    const text = description.trim();

    if (!text || language !== "sw") {
      return;
    }

    setTranslation("");
    setTranslationError("");

    try {
      if (!isTranslatorLoaded()) {
        setTranslationStatus("loading");
        await loadTranslator();
      }

      setTranslationStatus("translating");
      const result = await translateSwahiliToEnglish(text);
      setTranslation(result);
      setTranslationStatus("complete");
    } catch (error) {
      setTranslationStatus("failed");
      setTranslationError(
        error instanceof Error
          ? error.message
          : "Translation failed. Please try again.",
      );
    }
  }

  function handleLethargyAnswer(answer: boolean) {
    setPatientCase((current) =>
      current
        ? {
            ...current,
            symptoms: { ...current.symptoms, lethargy: answer },
            missing_fields: current.missing_fields.filter((field) => field !== "lethargy"),
          }
        : current,
    );
  }

  const needsFollowUp =
    patientCase !== null &&
    (patientCase.symptoms.lethargy === null ||
      patientCase.missing_fields.includes("lethargy"));

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
            {language === "sw" && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleTranslation}
                  disabled={
                    !description.trim() ||
                    translationStatus === "loading" ||
                    translationStatus === "translating"
                  }
                  className="rounded-xl border border-teal-700 bg-white px-4 py-2.5 text-sm font-bold text-teal-800 transition hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-300 disabled:text-slate-400"
                >
                  {translationStatus === "loading"
                    ? "Loading model..."
                    : translationStatus === "translating"
                      ? "Translating..."
                      : "Translate to English"}
                </button>
                {translationStatus === "failed" && (
                  <p role="alert" className="mt-2 text-sm font-medium text-red-700">
                    {translationError}
                  </p>
                )}
                {translationStatus === "complete" && translation && (
                  <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                      English Translation
                    </p>
                    <p className="mt-2 text-base leading-7 text-slate-800">
                      {translation}
                    </p>
                    <p className="mt-2 text-xs font-medium text-teal-700">
                      Translation complete
                    </p>
                  </div>
                )}
              </div>
            )}
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
            disabled={isAnalyzing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-wait disabled:bg-teal-500 sm:w-auto"
          >
            {isAnalyzing && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {isAnalyzing ? "Analyzing symptoms..." : "Analyze Symptoms"}
          </button>
        </div>
      </form>

      {patientCase && <ExtractionReview patientCase={patientCase} />}
      {needsFollowUp && <FollowUpQuestion onAnswer={handleLethargyAnswer} />}
      {patientCase && !needsFollowUp && <CaseSummary patientCase={patientCase} />}
    </div>
  );
}
