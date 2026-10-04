"use client";

import { useState } from "react";
import { DANGER_SIGNS } from "@/core/src/extract/phrase-matcher";
import type { Dropped } from "@/core/src/extract/guard";
import { SYMPTOM_LABELS } from "@/core/src/rules/who-imci";
import { SYMPTOM_KEYS, type StructuredCase, type SymptomKey } from "@/core/src/types";
import type { Reading } from "@/lib/intake";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAIN_SIGNS: SymptomKey[] = ["cough_or_difficult_breathing", "diarrhoea", "fever"];

const NUMBER_LABELS: Record<string, string> = {
  breaths_per_minute: "Breaths per minute",
  spo2_percent: "Oxygen saturation",
  duration_days: "Days sick",
  "symptom_days.cough": "Days of cough",
  "symptom_days.diarrhoea": "Days of diarrhoea",
  "symptom_days.fever": "Days of fever",
};

const fieldLabel = (field: string): string => SYMPTOM_LABELS[field as SymptomKey] ?? NUMBER_LABELS[field] ?? field;

function droppedLine(d: Dropped): string {
  const value = typeof d.value === "boolean" ? (d.value ? "yes" : "no") : d.field === "spo2_percent" ? `${d.value}%` : `${d.value}`;
  return `${fieldLabel(d.field)}: ${value}. ${d.why}`;
}

// Empty means not measured. Anything that isn't a sensible count is treated the same way.
function toCount(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const CHOICES: [string, boolean | null][] = [
  ["Yes", true],
  ["No", false],
  ["Not sure", null],
];

function choiceVariant(selected: boolean, value: boolean | null): "default" | "secondary" | "ghost" {
  if (!selected) return "ghost";
  if (value === null) return "secondary";
  return "default";
}

type SignRowProps = {
  label: string;
  value: boolean | null;
  note: string | null;
  flagged: boolean;
  onChange: (value: boolean | null) => void;
};

function SignRow({ label, value, note, flagged, onChange }: SignRowProps) {
  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {note && <p className={`mt-0.5 text-xs ${flagged ? "font-medium text-destructive" : "text-muted-foreground"}`}>{note}</p>}
      </div>
      <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 self-start rounded-lg border border-border p-0.5 sm:self-auto">
        {CHOICES.map(([text, choice]) => (
          <Button
            key={text}
            type="button"
            size="sm"
            variant={choiceVariant(value === choice, choice)}
            role="radio"
            aria-checked={value === choice}
            onClick={() => onChange(choice)}
          >
            {text}
          </Button>
        ))}
      </div>
    </li>
  );
}

type NumberFieldProps = { label: string; hint: string; value: string; onChange: (value: string) => void };

function NumberField({ label, hint, value, onChange }: NumberFieldProps) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Not measured"
        className="h-11 text-base md:text-base"
      />
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}

type CaseReviewProps = {
  reading: Reading;
  // What the worker confirmed last time, when they come back to edit it.
  confirmed?: StructuredCase;
  onConfirm: (confirmed: StructuredCase) => void;
};

export function CaseReview({ reading, confirmed, onConfirm }: CaseReviewProps) {
  const start = confirmed ?? reading.case;
  const [answers, setAnswers] = useState<StructuredCase["symptoms"]>({ ...start.symptoms });
  const [breaths, setBreaths] = useState(start.breaths_per_minute?.toString() ?? "");
  const [spo2, setSpo2] = useState(start.spo2_percent?.toString() ?? "");
  const [days, setDays] = useState(start.duration_days?.toString() ?? "");

  const dangerRows: SymptomKey[] = start.symptoms.convulsing_now != null ? [...DANGER_SIGNS, "convulsing_now"] : DANGER_SIGNS;
  const otherRows = SYMPTOM_KEYS.filter(
    (k) => !dangerRows.includes(k) && !MAIN_SIGNS.includes(k) && start.symptoms[k] != null,
  );

  function noteFor(key: SymptomKey): { note: string | null; flagged: boolean } {
    if (reading.modelOnly.includes(key)) return { note: "Local AI only, no matching words. Check this one.", flagged: true };
    const phrase = reading.evidence.filter((e) => e.field === key).at(-1)?.phrase;
    if (phrase) return { note: `From “${phrase}”`, flagged: false };
    return { note: reading.case.symptoms[key] == null ? "Not mentioned" : null, flagged: false };
  }

  const row = (key: SymptomKey) => {
    const { note, flagged } = noteFor(key);
    return (
      <SignRow
        key={key}
        label={SYMPTOM_LABELS[key]}
        value={answers[key] ?? null}
        note={note}
        flagged={flagged}
        onChange={(value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
      />
    );
  };

  function confirm() {
    const symptoms = Object.fromEntries(
      Object.entries(answers).filter(([, v]) => v !== undefined),
    ) as StructuredCase["symptoms"];
    onConfirm({
      ...reading.case,
      symptoms,
      breaths_per_minute: toCount(breaths),
      spo2_percent: toCount(spo2),
      duration_days: toCount(days),
      missing_fields: DANGER_SIGNS.filter((k) => symptoms[k] == null),
      confirmed_by_health_worker: true,
    });
  }

  const source =
    reading.reader === "local_ai"
      ? "Read by the local AI on this laptop, then checked against the caregiver's words."
      : "Read by the phrase matcher in this browser. No AI model, so it only marks what the words say.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check what was understood</CardTitle>
        <CardDescription>Confirm each sign with the caregiver. Nothing is decided until you confirm.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {reading.fallbackReason && (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm">Local AI unavailable: {reading.fallbackReason}</p>
        )}
        <p className="text-sm text-muted-foreground">{source}</p>
        {reading.dropped.length > 0 && (
          <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm">
            <p className="font-medium">Not used from the local AI</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {reading.dropped.map((d) => (
                <li key={`${d.field}-${d.value}`}>{droppedLine(d)}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="text-sm font-medium">General danger signs</h3>
          <ul>{dangerRows.map(row)}</ul>
        </div>
        <div>
          <h3 className="text-sm font-medium">Main symptoms</h3>
          <ul>{[...MAIN_SIGNS, ...otherRows].map(row)}</ul>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Breaths per minute" hint="Count for one full minute, child calm." value={breaths} onChange={setBreaths} />
          <NumberField label="Oxygen saturation (%)" hint="Only with a pulse oximeter." value={spo2} onChange={setSpo2} />
          <NumberField label="Days sick" hint="How long the child has been ill." value={days} onChange={setDays} />
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={confirm} className="h-11 px-4">
            Confirm and assess
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
