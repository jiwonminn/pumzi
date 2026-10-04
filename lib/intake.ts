import { guardReading, type GuardedReading } from "@/core/src/extract/guard";
import { processPatient } from "@/lib/api/processPatient";

export type Reader = "local_ai" | "phrase_matcher";

export type Reading = GuardedReading & {
  reader: Reader;
  translation: string | null;
  // Set when the local AI was tried and failed, so the worker knows why.
  fallbackReason: string | null;
};

// The backend listens on 127.0.0.1, so only a page served from the same machine can
// reach it. The hosted link and phones read the description in the browser instead.
function sameMachineAsBackend(): boolean {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

export async function readDescription(text: string, language: "en" | "sw", ageDays: number): Promise<Reading> {
  const options = { language, ageDays };
  if (!sameMachineAsBackend()) {
    return { ...guardReading(null, text, options), reader: "phrase_matcher", translation: null, fallbackReason: null };
  }
  try {
    const reply = await processPatient(text, language);
    const english = reply.translated_text?.trim() || null;
    // Check the model against the caregiver's words and the English it actually read.
    const words = english && english !== text ? `${text}. ${english}` : text;
    return {
      ...guardReading(reply.clinical_factors, words, options),
      reader: "local_ai",
      translation: english,
      fallbackReason: null,
    };
  } catch (error) {
    return {
      ...guardReading(null, text, options),
      reader: "phrase_matcher",
      translation: null,
      fallbackReason: error instanceof Error ? error.message : "The local AI could not read this.",
    };
  }
}
