import type { ClinicalFactors } from "@/lib/clinicalFactors";

export type ProcessPatientResponse = {
  original_text: string;
  translated_text: string | null;
  clinical_factors: ClinicalFactors;
};

const LOCAL_AI_URL = "http://127.0.0.1:8000";

export async function processPatient(
  text: string,
  language: "en" | "sw",
): Promise<ProcessPatientResponse> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120_000);

  try {
    const response = await fetch(`${LOCAL_AI_URL}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new Error(
        typeof detail?.detail === "string"
          ? detail.detail
          : "Local AI service failed to process this input.",
      );
    }
    return (await response.json()) as ProcessPatientResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Local AI processing timed out.");
    }
    if (error instanceof TypeError) {
      throw new Error("Local AI service is not running.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
