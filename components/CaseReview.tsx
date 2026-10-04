"use client";

import { useState } from "react";
import { DANGER_SIGNS } from "@/core/src/extract/phrase-matcher";
import type { Dropped } from "@/core/src/extract/guard";
import { SYMPTOM_LABELS } from "@/core/src/rules/who-imci";
import { SYMPTOM_KEYS, type StructuredCase, type SymptomKey } from "@/core/src/types";
import type { Reading } from "@/lib/intake";

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

function choiceClass(selected: boolean, value: boolean | null): string {
  if (!selected) return "text-slate-600 hover:bg-slate-50";
  if (value === true) return "bg-rose-700 text-white";
  if (value === false) return "bg-slate-800 text-white";
  return "bg-amber-100 text-amber-900";
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
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        {note && <p className={`mt-0.5 text-xs ${flagged ? "font-semibold text-amber-700" : "text-slate-500"}`}>{note}</p>}
      </div>
      <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 self-start rounded-xl border border-slate-300 bg-white p-0.5 sm:self-auto">
        {CHOICES.map(([text, choice]) => (
          <button
            key={text}
            type="button"
            role="radio"
            aria-checked={value === choice}
            onClick={() => onChange(choice)}
            className={`rounded-[10px] px-3 py-1.5 text-sm font-semibold transition ${choiceClass(value === choice, choice)}`}
          >
            {text}
          </button>
        ))}
      </div>
    </li>
  );
}

type NumberFieldProps = { label: string; hint: string; value: string; onChange: (value: string) => void };

function NumberField({ label, hint, value, onChange }: NumberFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Not measured"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
      />
      <span className="mt-1 block text-xs text-slate-500">{hint}</span>
    </label>
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-600">Step 2</p>
      <h2 className="text-xl font-bold text-slate-900">Check what was understood</h2>
      <p className="mt-1 text-sm text-slate-500">Confirm each sign with the caregiver. Nothing is decided until you confirm.</p>

      <div className="mt-4 space-y-2 text-sm">
        {reading.fallbackReason && (
          <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-slate-600">Local AI unavailable: {reading.fallbackReason}</p>
        )}
        <p className="rounded-xl bg-teal-50/70 px-4 py-2.5 text-teal-900">{source}</p>
        {reading.dropped.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-amber-900">
            <p className="font-semibold">Not used from the local AI</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {reading.dropped.map((d) => (
                <li key={`${d.field}-${d.value}`}>{droppedLine(d)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <h3 className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">General danger signs</h3>
      <ul className="divide-y divide-slate-100">{dangerRows.map(row)}</ul>

      <h3 className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Main symptoms</h3>
      <ul className="divide-y divide-slate-100">{[...MAIN_SIGNS, ...otherRows].map(row)}</ul>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <NumberField label="Breaths per minute" hint="Count for one full minute, child calm." value={breaths} onChange={setBreaths} />
        <NumberField label="Oxygen saturation (%)" hint="Only with a pulse oximeter." value={spo2} onChange={setSpo2} />
        <NumberField label="Days sick" hint="How long the child has been ill." value={days} onChange={setDays} />
      </div>

      <div className="mt-6 flex justify-end border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={confirm}
          className="w-full rounded-xl bg-teal-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 sm:w-auto"
        >
          Confirm and assess
        </button>
      </div>
    </section>
  );
}
