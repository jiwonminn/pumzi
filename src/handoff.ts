import { ACTIONS, TITLES, caregiverSpeech, reasonCodes, smsBody } from "./copy";
import exampleJson from "../shared/example-output.json";
import type {
  Citation,
  ClinicalHandoff,
  Decision,
  DecisionCode,
  FacilityRecommendation,
  FollowUpQuestion,
  OutputPacket,
  Passport,
  ResultModel,
  StoredEncounter,
} from "./types";
import { SYMPTOM_KEYS, type StructuredCase } from "../core/src/types";

const DECISIONS: readonly DecisionCode[] = [
  "urgent_referral",
  "referral",
  "treat_at_clinic",
  "home_care",
  "need_more_info",
  "out_of_scope",
  "safe_fallback",
];

export const EXAMPLE_PASSPORT_ID = "CP-1042";

function clipped(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > max) return null;
  return text;
}

function isCode(value: unknown): value is DecisionCode {
  return typeof value === "string" && DECISIONS.includes(value as DecisionCode);
}

function strings(value: unknown, maxItems: number, maxLen: number): string[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const out: string[] = [];
  for (const item of value) {
    const text = clipped(item, maxLen);
    if (!text) return null;
    out.push(text);
  }
  return out;
}

function numberMap(value: unknown): Record<string, number | null> | null {
  if (value == null) return {};
  if (!value || typeof value !== "object") return null;
  const out: Record<string, number | null> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "number" && item !== null) return null;
    if (typeof item === "number" && (!Number.isFinite(item) || item < 0)) return null;
    out[key.slice(0, 40)] = item;
  }
  return out;
}

function parseQuestions(value: unknown): FollowUpQuestion[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 8) return null;
  const out: FollowUpQuestion[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const question = clipped((item as { question?: unknown }).question, 240);
    if (!question) return null;
    out.push({ question });
  }
  return out;
}

function parseCitations(value: unknown): Citation[] | null {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 8) return null;
  const out: Citation[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const ruleId = clipped(row.rule_id, 40);
    const quote = clipped(row.quote, 500);
    const source = clipped(row.source, 120);
    const page = row.pdf_page;
    if (!ruleId || !quote || !source || typeof page !== "number" || !Number.isInteger(page) || page < 1 || page > 200) {
      return null;
    }
    out.push({ rule_id: ruleId, quote, source, pdf_page: page });
  }
  return out;
}

export function parseDecision(raw: unknown): Decision | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!isCode(row.decision)) return null;
  if (row.level_so_far !== null && !isCode(row.level_so_far)) return null;
  const classifications = strings(row.classifications, 12, 120);
  const reasons = strings(row.reasons, 12, 240);
  const fired = strings(row.fired_rules, 20, 40);
  const care = strings(row.required_care, 12, 40);
  const questions = parseQuestions(row.follow_up_questions);
  const citations = parseCitations(row.citations);
  const notes = strings(row.notes, 12, 240);
  if (!classifications || !reasons || !fired || !care || !questions || !citations || !notes) return null;
  return {
    decision: row.decision,
    level_so_far: row.level_so_far === null ? null : row.level_so_far,
    classifications,
    reasons,
    fired_rules: fired,
    required_care: care,
    follow_up_questions: questions,
    citations,
    notes,
  };
}

export function parseFacility(raw: unknown): FacilityRecommendation | null {
  if (raw == null) return null;
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const facilityId = clipped(row.facility_id, 40);
  const name = clipped(row.name, 120);
  const why = clipped(row.why, 240);
  const matched = strings(row.matched_services, 12, 40);
  const missing = strings(row.missing_services, 12, 40);
  const distance = row.distance_km;
  if (!facilityId || !name || !why || !matched || !missing) return null;
  if (typeof distance !== "number" || !Number.isFinite(distance) || distance < 0) return null;
  return {
    facility_id: facilityId,
    name,
    matched_services: matched,
    missing_services: missing,
    distance_km: distance,
    why,
  };
}

export function parsePacket(raw: unknown): OutputPacket | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (row.decision && typeof row.decision === "object") {
    const decision = parseDecision(row.decision);
    const language = row.language;
    if (!decision || (language !== "sw" && language !== "en")) return null;
    const facility = row.facility == null ? null : parseFacility(row.facility);
    if (row.facility != null && !facility) return null;
    return { language, decision, facility };
  }
  const decision = parseDecision(raw);
  if (!decision) return null;
  return { language: "en", decision, facility: null };
}

const example = parsePacket(exampleJson);
if (!example) throw new Error("Example output JSON is invalid");
export const EXAMPLE: OutputPacket = example;

export function loadHandoff(stored: string | null): { handoff: OutputPacket; example: boolean; clinicalCase: StructuredCase | null } {
  if (!stored) return { handoff: EXAMPLE, example: true, clinicalCase: null };
  try {
    const raw = JSON.parse(stored) as unknown;
    const packet =
      raw && typeof raw === "object" && "packet" in raw
        ? parsePacket((raw as { packet?: unknown }).packet)
        : parsePacket(raw);
    const clinicalCase =
      raw && typeof raw === "object" && "case" in raw
        ? parseClinicalCase((raw as { case?: unknown }).case)
        : null;
    const parsed = packet;
    if (!parsed) return { handoff: EXAMPLE, example: true, clinicalCase: null };
    return { handoff: parsed, example: false, clinicalCase };
  } catch {
    return { handoff: EXAMPLE, example: true, clinicalCase: null };
  }
}

export function newPassportId(): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CP-${suffix}`;
}

export function stamp(now: Date): string {
  return now.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function buildPassport(packet: OutputPacket, passportId: string, now: Date = new Date()): Passport {
  return {
    passport_id: passportId,
    timestamp: stamp(now),
    language: packet.language,
    decision: packet.decision.decision,
    facility: packet.facility?.name ?? "",
    reason: reasonCodes(packet.decision.reasons),
  };
}

function parseClinicalCase(raw: unknown): StructuredCase | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const age = row.age_days;
  const duration = row.duration_days;
  const language = row.language;
  const symptoms = row.symptoms;
  if (
    (age !== null && (typeof age !== "number" || !Number.isFinite(age) || age < 0)) ||
    (duration !== null && (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0)) ||
    (language !== "sw" && language !== "en") ||
    !symptoms ||
    typeof symptoms !== "object"
  ) return null;
  const parsedSymptoms: StructuredCase["symptoms"] = {};
  for (const key of SYMPTOM_KEYS) {
    const value = (symptoms as Record<string, unknown>)[key];
    if (value !== undefined && value !== null && typeof value !== "boolean") return null;
    parsedSymptoms[key] = value === undefined ? null : value;
  }
  return {
    age_days: age as number | null,
    symptoms: parsedSymptoms,
    duration_days: duration as number | null,
    symptom_days: typeof row.symptom_days === "object" && row.symptom_days ? row.symptom_days as StructuredCase["symptom_days"] : undefined,
    breaths_per_minute: typeof row.breaths_per_minute === "number" ? row.breaths_per_minute : null,
    spo2_percent: typeof row.spo2_percent === "number" ? row.spo2_percent : null,
    missing_fields: Array.isArray(row.missing_fields) ? row.missing_fields.filter((value): value is string => typeof value === "string") : [],
    confidence: typeof row.confidence === "number" ? row.confidence : 0,
    confirmed_by_health_worker: row.confirmed_by_health_worker === true,
    language,
  };
}

const priorityFor = (decision: DecisionCode): ClinicalHandoff["referral"]["priority"] => {
  if (decision === "urgent_referral") return "urgent";
  if (decision === "referral") return "referral";
  if (decision === "treat_at_clinic") return "clinic";
  if (decision === "home_care") return "home";
  return "unknown";
};

export function buildClinicalHandoff(
  packet: OutputPacket,
  passport: Passport,
  clinicalCase: StructuredCase | null,
): ClinicalHandoff {
  const symptoms = Object.fromEntries(
    SYMPTOM_KEYS.map((key) => [key, clinicalCase?.symptoms[key] ?? null]),
  );
  return {
    v: 1,
    id: passport.passport_id,
    created_at: passport.timestamp,
    age_days: clinicalCase?.age_days ?? null,
    language: passport.language,
    symptoms,
    duration_days: clinicalCase?.duration_days ?? null,
    symptom_days: clinicalCase?.symptom_days ?? {},
    breaths_per_minute: clinicalCase?.breaths_per_minute ?? null,
    spo2_percent: clinicalCase?.spo2_percent ?? null,
    referral: {
      priority: priorityFor(passport.decision),
      reasons: passport.reason,
      destination: passport.facility,
    },
    confirmed_by_health_worker: clinicalCase?.confirmed_by_health_worker === true,
  };
}

export function handoffJson(handoff: ClinicalHandoff): string {
  return JSON.stringify(handoff);
}

export function parseHandoff(text: string): ClinicalHandoff | null {
  try {
    const raw = JSON.parse(text) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    if (row.v !== 1) return null;
    const id = clipped(row.id, 16);
    const createdAt = clipped(row.created_at, 40);
    const language = row.language;
    const symptoms = row.symptoms;
    const referral = row.referral;
    if (!id || !/^CP-[A-Z0-9]{4,8}$/i.test(id) || !createdAt || Number.isNaN(Date.parse(createdAt))) return null;
    if (language !== "sw" && language !== "en") return null;
    if (!symptoms || typeof symptoms !== "object") return null;
    const parsedSymptoms: Record<string, boolean | null> = {};
    for (const key of SYMPTOM_KEYS) {
      const value = (symptoms as Record<string, unknown>)[key];
      if (typeof value !== "boolean" && value !== null) return null;
      parsedSymptoms[key] = value;
    }
    if (!referral || typeof referral !== "object") return null;
    const referralRow = referral as Record<string, unknown>;
    const priority = referralRow.priority;
    const reasons = strings(referralRow.reasons, 12, 40);
    const destination = typeof referralRow.destination === "string" ? referralRow.destination.trim().slice(0, 120) : null;
    const age = row.age_days;
    const duration = row.duration_days;
    const breaths = row.breaths_per_minute;
    const spo2 = row.spo2_percent;
    const symptomDays = numberMap(row.symptom_days);
    if (!["urgent", "referral", "clinic", "home", "unknown"].includes(priority as string) || !reasons || destination === null || !symptomDays) return null;
    if (age !== null && (typeof age !== "number" || !Number.isFinite(age) || age < 0)) return null;
    if (duration !== null && (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0)) return null;
    if (breaths !== null && (typeof breaths !== "number" || !Number.isFinite(breaths) || breaths < 0)) return null;
    if (spo2 !== null && (typeof spo2 !== "number" || !Number.isFinite(spo2) || spo2 < 0)) return null;
    if (typeof row.confirmed_by_health_worker !== "boolean") return null;
    return {
      v: 1,
      id,
      created_at: stamp(new Date(createdAt)),
      age_days: age as number | null,
      language,
      symptoms: parsedSymptoms,
      duration_days: duration as number | null,
      symptom_days: symptomDays,
      breaths_per_minute: breaths as number | null,
      spo2_percent: spo2 as number | null,
      referral: { priority: priority as ClinicalHandoff["referral"]["priority"], reasons, destination },
      confirmed_by_health_worker: row.confirmed_by_health_worker,
    };
  } catch {
    return null;
  }
}

export function passportJson(passport: Passport): string {
  const minimal: Passport = {
    passport_id: passport.passport_id,
    timestamp: passport.timestamp,
    language: passport.language,
    decision: passport.decision,
    facility: passport.facility,
    reason: passport.reason,
  };
  return JSON.stringify(minimal);
}

export function parsePassport(text: string): Passport | null {
  const handoff = parseHandoff(text);
  if (handoff) {
    return {
      passport_id: handoff.id,
      timestamp: handoff.created_at,
      language: handoff.language,
      decision: handoff.referral.priority === "urgent" ? "urgent_referral" : handoff.referral.priority === "referral" ? "referral" : handoff.referral.priority === "clinic" ? "treat_at_clinic" : handoff.referral.priority === "home" ? "home_care" : "safe_fallback",
      facility: handoff.referral.destination,
      reason: handoff.referral.reasons,
    };
  }
  try {
    const raw = JSON.parse(text) as unknown;
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    if (!isCode(row.decision)) return null;
    const language = row.language;
    if (language !== "sw" && language !== "en") return null;
    const facility = typeof row.facility === "string" ? row.facility.trim().slice(0, 120) : null;
    const timestamp = clipped(row.timestamp, 40);
    const passportId = clipped(row.passport_id, 16);
    const reason = strings(row.reason, 12, 40);
    if (facility == null || !timestamp || !passportId || !reason) return null;
    if (!/^CP-[A-Z0-9]{4,8}$/i.test(passportId)) return null;
    if (Number.isNaN(Date.parse(timestamp))) return null;
    for (const code of reason) {
      if (!/^[a-z0-9_]+$/.test(code)) return null;
    }
    return {
      passport_id: passportId,
      timestamp: stamp(new Date(timestamp)),
      language,
      decision: row.decision,
      facility,
      reason,
    };
  } catch {
    return null;
  }
}

export function present(
  packet: OutputPacket,
  passportId: string,
  now: Date = new Date(),
  example = false,
  clinicalCase: StructuredCase | null = null,
): ResultModel {
  const reasonText = packet.decision.reasons.join("; ");
  const destination = packet.facility?.name ?? null;
  const passport = buildPassport(packet, passportId, now);
  const spoken = caregiverSpeech(
    packet.decision.decision,
    passport.reason,
    reasonText,
    destination ?? "",
    packet.language,
  );
  return {
    title: TITLES[packet.decision.decision],
    reasons: packet.decision.reasons,
    destination,
    action: ACTIONS[packet.decision.decision],
    facilityWhy: packet.facility?.why ?? null,
    matchedServices: packet.facility?.matched_services ?? [],
    questions: packet.decision.follow_up_questions.map((item) => item.question),
    citations: packet.decision.citations,
    caregiverLine: packet.language === "sw" ? spoken : null,
    passport,
    smsBody: smsBody(spoken, packet.language, passport.passport_id),
    clinicalCase,
    example,
  };
}

export function toStored(model: ResultModel): StoredEncounter {
  return {
    passport: model.passport,
    reason_text: model.reasons.join("; "),
    action_text: model.action,
    facility_why: model.facilityWhy,
    referral_status: "referred",
    sms_body: model.smsBody,
    sms_status: "queued",
    caregiver_phone: "",
  };
}
