"use client";

import { useState } from "react";
import { answerKind } from "@/core/src/case/answers";
import type { Decision, DecisionLevel } from "@/core/src/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>A few more checks</CardTitle>
          <CardDescription>
            The WHO chart needs {questions.length === 1 ? "this answer" : "these answers"} before it can decide. Unknown is never treated as no.
            {decision.level_so_far && ` So far it points to ${LEVEL_LABELS[decision.level_so_far]}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <ol className="grid gap-3">
            {questions.map((q, i) => {
              const kind = answerKind(q.field);
              const value = values[q.field];
              return (
                <li key={q.field} className="rounded-lg border border-border px-3 py-3">
                  <p className="text-sm font-medium">
                    {i + 1}. {q.question}
                  </p>
                  {kind.kind === "yes_no" ? (
                    <div className="mt-3 flex gap-2">
                      {([["Yes", true], ["No", false]] as const).map(([text, choice]) => (
                        <Button
                          key={text}
                          type="button"
                          variant={value === choice ? "default" : "outline"}
                          aria-pressed={value === choice}
                          onClick={() => set(q.field, choice)}
                        >
                          {text}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <label className="mt-3 flex items-center gap-3">
                      <Input
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) => set(q.field, event.target.value)}
                        className="h-11 w-32 text-base md:text-base"
                      />
                      <span className="text-sm text-muted-foreground">{kind.unit}</span>
                    </label>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="flex justify-end">
            <Button type="submit" disabled={!ready} className="h-11 px-4">
              Continue
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
