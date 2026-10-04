"use client";

import { useRef, useState } from "react";
import { ageDaysFrom, applyAnswers } from "@/core/src/case/answers";
import { DEMO_FACILITIES, DEMO_ORIGIN } from "@/core/src/navigation/demo-facilities";
import { decide } from "@/core/src/pipeline";
import { IMCI_PROTOCOL } from "@/core/src/rules/who-imci";
import type { Decision, StructuredCase } from "@/core/src/types";
import { readDescription, type Reading } from "@/lib/intake";
import { CaseReview } from "./CaseReview";
import { FollowUpQuestions, type Answer } from "./FollowUpQuestions";

type Language = "en" | "sw";

type Stage =
  | { name: "describe" }
  | { name: "review"; id: number; reading: Reading; confirmed?: StructuredCase }
  | { name: "questions"; id: number; reading: Reading; confirmed: StructuredCase; current: StructuredCase; decision: Decision };

const inputClass =
  "w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10";

export function IntakeForm() {
  const [language, setLanguage] = useState<Language>("en");
  const [years, setYears] = useState("");
  const [months, setMonths] = useState("");
  const [description, setDescription] = useState("");
  const [stage, setStage] = useState<Stage>({ name: "describe" });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  // Each new reading gets a fresh review, so answers from the last one don't carry over.
  const readings = useRef(0);

  const translation = stage.name === "describe" ? null : stage.reading.translation;

  function ageDays(): number | null {
    if (!years.trim() && !months.trim()) return null;
    const y = Number(years || 0);
    const m = Number(months || 0);
    if (!Number.isFinite(y) || !Number.isFinite(m) || y < 0 || m < 0) return null;
    return ageDaysFrom(y, m);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = description.trim();
    const age = ageDays();
    if (!text) return;
    if (age === null) {
      setError("Enter the child's age in years, months or both.");
      return;
    }

    setProcessing(true);
    setError("");
    setStage({ name: "describe" });
    try {
      const reading = await readDescription(text, language, age);
      readings.current += 1;
      setStage({ name: "review", id: readings.current, reading });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the description.");
    } finally {
      setProcessing(false);
    }
  }

  // Runs the WHO rules. Follow-up questions come back here; any other result goes to the handoff.
  function assess(id: number, reading: Reading, confirmed: StructuredCase, current: StructuredCase) {
    const result = decide(current, IMCI_PROTOCOL, DEMO_FACILITIES, DEMO_ORIGIN);
    if (!result.ok) {
      setError(result.errors.join(" "));
      return;
    }
    setError("");
    const { decision } = result.packet;
    if (decision.decision === "need_more_info") {
      setStage({ name: "questions", id, reading, confirmed, current: result.case, decision });
      return;
    }
    try {
      localStorage.setItem("pumzi.decision", JSON.stringify(result.packet));
    } catch {
      setError("Could not save the result on this device, so the handoff can't open it.");
      return;
    }
    window.location.assign("/handoff");
  }

  function answer(answers: Answer[]) {
    if (stage.name !== "questions") return;
    try {
      assess(stage.id, stage.reading, stage.confirmed, applyAnswers(stage.current, answers));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record that answer.");
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

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
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
          </label>
          <div className="space-y-5">
            <fieldset>
              <legend className="mb-2 block text-sm font-semibold text-slate-700">Patient age</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="relative block">
                  <input
                    min="0"
                    max="17"
                    type="number"
                    inputMode="numeric"
                    aria-label="Years"
                    value={years}
                    onChange={(event) => setYears(event.target.value)}
                    placeholder="2"
                    className={`${inputClass} pr-10`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">yrs</span>
                </label>
                <label className="relative block">
                  <input
                    min="0"
                    max="11"
                    type="number"
                    inputMode="numeric"
                    aria-label="Months"
                    value={months}
                    onChange={(event) => setMonths(event.target.value)}
                    placeholder="0"
                    className={`${inputClass} pr-10`}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">mo</span>
                </label>
              </div>
              <p className="mt-1 text-xs text-slate-500">Under 1 year: use months.</p>
            </fieldset>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Description language</span>
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              >
                <option value="en">English</option>
                <option value="sw">Swahili</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-stretch gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-end">
          {error && <p role="alert" className="text-sm font-medium text-red-700 sm:mr-auto">{error}</p>}
          <button
            type="submit"
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-wait disabled:bg-teal-500 sm:w-auto"
          >
            {processing && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {processing ? "Processing locally..." : "Analyze Symptoms"}
          </button>
        </div>
      </form>

      {stage.name === "review" && (
        <CaseReview
          key={stage.id}
          reading={stage.reading}
          confirmed={stage.confirmed}
          onConfirm={(confirmed) => assess(stage.id, stage.reading, confirmed, confirmed)}
        />
      )}

      {stage.name === "questions" && (
        <>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
            <span>Signs confirmed by the health worker.</span>
            <button
              type="button"
              onClick={() => setStage({ name: "review", id: stage.id, reading: stage.reading, confirmed: stage.confirmed })}
              className="font-semibold text-teal-700 underline-offset-4 hover:underline"
            >
              Edit
            </button>
          </div>
          <FollowUpQuestions
            key={stage.decision.follow_up_questions.map((q) => q.field).join()}
            decision={stage.decision}
            onSubmit={answer}
          />
        </>
      )}
    </div>
  );
}
