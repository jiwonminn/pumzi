import type { CareNeed } from "../types";

// What the health worker sees instead of the raw keys.
export const CARE_NEED_LABELS: Record<CareNeed, string> = {
  pediatric_emergency: "Emergency care for children",
  oxygen: "Oxygen",
  iv_rehydration: "IV fluids",
  oral_rehydration: "Oral rehydration (ORS)",
  antibiotics: "Antibiotics",
  malaria_test: "Malaria test",
  clinician: "Clinician",
};

// Unknown keys fall back to the key itself rather than showing nothing.
export const careNeedLabel = (need: string): string => CARE_NEED_LABELS[need as CareNeed] ?? need;

export const careNeedList = (needs: string[]): string => needs.map(careNeedLabel).join(", ");
