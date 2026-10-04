"use client";

import { useState } from "react";
import { answerKind } from "@/core/src/case/answers";
import type { Decision, DecisionLevel } from "@/core/src/types";

export type Answer = { field: string; value: boolean | number };

const LEVEL_LABELS: Record<DecisionLevel, string> = {
  urgent_referral: "urgent referral",
  referral: "referral",
  treat_at_clinic: "treat at the clinic",
  home_care: "home care",
};

type FollowUpQuestionsProps = {
  decision: Decision;
  onSubmit: (answers: Answer[]) => void;
};

export function FollowUpQuestions({ decision, onSubmit }: FollowUpQuestionsProps) {
  const questions = decision.follow_up_questions;
  // Yes/no answers are booleans, counts stay as typed until submit.
  const [values, setValues] = useState<Record<string, boolean | string>>({});

  const set = (field: string, value: boolean | string) => setValues((prev) => ({ ...prev, [field]: value }));
  const answered = (field: string) => {
    const v = values[field];
    return typeof v === "boolean" || (typeof v === "string" && v.trim() !== "" && Number(v) >= 0);
  };
  const ready = questions.every((q) => answered(q.field));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    onSubmit(
      questions.map((q) => {
        const v = values[q.field];
        return { field: q.field, value: typeof v === "boolean" ? v : Number(v) };
      }),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-7">
      <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Step 3</p>
      <h2 className="text-xl font-bold text-slate-900">A few more checks</h2>
      <p className="mt-1 text-sm text-slate-600">
        The WHO chart needs {questions.length === 1 ? "this answer" : "these answers"} before it can decide. Unknown is never
        treated as no.
        {decision.level_so_far && ` So far it points to ${LEVEL_LABELS[decision.level_so_far]}.`}
      </p>

      <ol className="mt-5 space-y-4">
        {questions.map((q, i) => {
          const kind = answerKind(q.field);
          const value = values[q.field];
          return (
            <li key={q.field} className="rounded-xl border border-amber-100 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">
                {i + 1}. {q.question}
              </p>
              {kind.kind === "yes_no" ? (
                <div className="mt-3 flex gap-2">
                  {([["Yes", true], ["No", false]] as const).map(([text, choice]) => (
                    <button
                      key={text}
                      type="button"
                      aria-pressed={value === choice}
                      onClick={() => set(q.field, choice)}
                      className={`rounded-xl px-5 py-2 text-sm font-bold transition ${
                        value === choice
                          ? "bg-slate-900 text-white"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              ) : (
                <label className="mt-3 flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={typeof value === "string" ? value : ""}
                    onChange={(event) => set(q.field, event.target.value)}
                    className="w-32 rounded-xl border border-slate-300 px-3 py-2 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                  />
                  <span className="text-sm text-slate-500">{kind.unit}</span>
                </label>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={!ready}
          className="w-full rounded-xl bg-teal-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
