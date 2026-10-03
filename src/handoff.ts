import { ACTIONS, TITLES, caregiverSpeech, reasonCodes, smsBody } from "./copy";
import exampleJson from "../shared/example-output.json";
import type {
  Citation,
  Decision,
  DecisionCode,
  FacilityRecommendation,
  FollowUpQuestion,
  OutputPacket,
  Passport,
  ResultModel,
  StoredEncounter,
} from "./types";

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

export function loadHandoff(stored: string | null): { handoff: OutputPacket; example: boolean } {
  if (!stored) return { handoff: EXAMPLE, example: true };
  try {
    const parsed = parsePacket(JSON.parse(stored) as unknown);
    if (!parsed) return { handoff: EXAMPLE, example: true };
    return { handoff: parsed, example: false };
  } catch {
    return { handoff: EXAMPLE, example: true };
  }
}

export function newPassportId(): string {
  const n = 1000 + Math.floor(Math.random() * 9000);
  return `CP-${n}`;
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
    if (!/^CP-\d{4}$/.test(passportId)) return null;
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
