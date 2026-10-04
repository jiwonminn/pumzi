"use client";

import { useRef, useState } from "react";
import { ageDaysFrom, applyAnswers } from "@/core/src/case/answers";
import { DEMO_FACILITIES, DEMO_ORIGIN } from "@/core/src/navigation/demo-facilities";
import { decide } from "@/core/src/pipeline";
import { IMCI_PROTOCOL } from "@/core/src/rules/who-imci";
import type { Decision, StructuredCase } from "@/core/src/types";
import { readDescription, type Reading } from "@/lib/intake";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CaseReview } from "./CaseReview";
import { FollowUpQuestions, type Answer } from "./FollowUpQuestions";

type Language = "en" | "sw";

type Stage =
  | { name: "describe" }
  | { name: "review"; id: number; reading: Reading; confirmed?: StructuredCase }
  | { name: "questions"; id: number; reading: Reading; confirmed: StructuredCase; current: StructuredCase; decision: Decision };

const fieldClass = "h-11 text-base md:text-base";

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
      localStorage.setItem(
        "pumzi.decision",
        JSON.stringify({ packet: result.packet, case: { ...current, confirmed_by_health_worker: true } }),
      );
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
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>What the caregiver said</CardTitle>
            <CardDescription>In their own words. Age is required.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                placeholder="My child is 2 years old, has had a fever since yesterday, and cannot drink."
                className="min-h-32 text-base md:text-base"
              />
              {language === "sw" && translation && (
                <div className="rounded-lg border border-border bg-muted px-3 py-2">
                  <p className="text-sm text-muted-foreground">English</p>
                  <p className="mt-1 text-base leading-6">{translation}</p>
                </div>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">Age</legend>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label htmlFor="years" className="text-muted-foreground">Years</Label>
                    <Input
                      id="years"
                      min="0"
                      max="17"
                      type="number"
                      inputMode="numeric"
                      value={years}
                      onChange={(event) => setYears(event.target.value)}
                      placeholder="2"
                      className={fieldClass}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="months" className="text-muted-foreground">Months</Label>
                    <Input
                      id="months"
                      min="0"
                      max="11"
                      type="number"
                      inputMode="numeric"
                      value={months}
                      onChange={(event) => setMonths(event.target.value)}
                      placeholder="0"
                      className={fieldClass}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Under 1 year: use months.</p>
              </fieldset>
              <div className="grid gap-2">
                <Label htmlFor="language">Language</Label>
                <select
                  id="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Language)}
                  className="h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="en">English</option>
                  <option value="sw">Swahili</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
              {error && <p role="alert" className="text-sm text-destructive sm:mr-auto">{error}</p>}
              <Button type="submit" disabled={processing} className="h-11 px-4 sm:w-auto">
                {processing ? "Reading…" : "Read the description"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>

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
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-sm">
            <span>Signs confirmed by the health worker.</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStage({ name: "review", id: stage.id, reading: stage.reading, confirmed: stage.confirmed })}
            >
              Edit
            </Button>
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
