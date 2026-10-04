/** Mirrors core/src/types.ts. Core owns changes. */

export type DecisionCode =
  | "urgent_referral"
  | "referral"
  | "treat_at_clinic"
  | "home_care"
  | "need_more_info"
  | "out_of_scope"
  | "safe_fallback";

export type LanguageCode = "sw" | "en";

export interface FollowUpQuestion {
  question: string;
}

export interface Citation {
  rule_id: string;
  quote: string;
  source: string;
  pdf_page: number;
}

export interface Decision {
  decision: DecisionCode;
  level_so_far: DecisionCode | null;
  classifications: string[];
  reasons: string[];
  fired_rules: string[];
  required_care: string[];
  follow_up_questions: FollowUpQuestion[];
  citations: Citation[];
  notes: string[];
}

export interface FacilityRecommendation {
  facility_id: string;
  name: string;
  matched_services: string[];
  missing_services: string[];
  distance_km: number;
  why: string;
}

/** What this layer receives. Language comes from the structured case. */
export interface OutputPacket {
  language: LanguageCode;
  decision: Decision;
  facility: FacilityRecommendation | null;
}

export interface Passport {
  passport_id: string;
  timestamp: string;
  language: LanguageCode;
  decision: DecisionCode;
  facility: string;
  reason: string[];
}

export interface ClinicalHandoff {
  v: 1;
  id: string;
  created_at: string;
  age_days: number | null;
  language: LanguageCode;
  symptoms: Record<string, boolean | null>;
  duration_days: number | null;
  symptom_days: Record<string, number | null>;
  breaths_per_minute: number | null;
  spo2_percent: number | null;
  referral: {
    priority: "urgent" | "referral" | "clinic" | "home" | "unknown";
    reasons: string[];
    destination: string;
  };
  confirmed_by_health_worker: boolean;
}

export type ReferralStatus = "referred" | "arrived" | "follow_up_done";

export type SmsStatus = "queued" | "shown";

export interface StoredEncounter {
  passport: Passport;
  reason_text: string;
  action_text: string;
  facility_why: string | null;
  referral_status: ReferralStatus;
  sms_body: string;
  sms_status: SmsStatus;
  caregiver_phone: string;
}

export interface ResultModel {
  title: string;
  reasons: string[];
  destination: string | null;
  action: string;
  facilityWhy: string | null;
  matchedServices: string[];
  questions: string[];
  citations: Citation[];
  caregiverLine: string | null;
  passport: Passport;
  smsBody: string;
  clinicalCase: import("../core/src/types").StructuredCase | null;
  example: boolean;
}

export type ViewName = "result" | "history" | "outbox" | "scan";
