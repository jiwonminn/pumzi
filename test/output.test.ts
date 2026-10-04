import { describe, expect, it } from "vitest";
import { careNeedLabel, smsComposerHref } from "../src/copy";
import { decryptString, deriveKey, encryptString, pinIsValid } from "../src/crypto";
import {
  EXAMPLE,
  EXAMPLE_PASSPORT_ID,
  parsePacket,
  parsePassport,
  passportJson,
  present,
  toStored,
} from "../src/handoff";

const NOW = new Date("2026-10-03T19:00:00.000Z");

describe("result screen", () => {
  const model = present(EXAMPLE, EXAMPLE_PASSPORT_ID, NOW, true);

  it("uses the decision layer's words for a care need", () => {
    expect(careNeedLabel("pediatric_emergency")).toBe("Emergency care for children");
    expect(careNeedLabel("not_a_need")).toBe("not_a_need");
  });

  it("shows the contract example", () => {
    expect(model.title).toBe("Urgent referral recommended");
    expect(model.reasons).toEqual(["Not able to drink or breastfeed"]);
    expect(model.destination).toBe("Good Samaritan ACK Medical Clinic");
    expect(model.action).toBe("Please go to the recommended facility.");
    expect(model.facilityWhy).toContain("0.1 km");
    expect(model.facilityWhy).toContain("Emergency care for children");
    expect(model.citations[0]?.pdf_page).toBe(5);
    expect(model.passport.passport_id).toBe("CP-1042");
    expect(model.caregiverLine).toContain("Hawezi kunywa");
    expect(model.caregiverLine).toContain("Good Samaritan ACK Medical Clinic");
  });

  it("keeps the passport to the six contract fields", () => {
    const parsed = JSON.parse(passportJson(model.passport)) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual([
      "passport_id",
      "timestamp",
      "language",
      "decision",
      "facility",
      "reason",
    ]);
    expect(parsed.reason).toEqual(["cannot_drink"]);
    expect(parsed.symptoms).toBeUndefined();
    expect(JSON.stringify(parsed)).not.toContain("PIN");
  });

  it("queues an SMS with the ID", () => {
    expect(model.smsBody).toContain("CP-1042");
    expect(model.smsBody).toContain("si utambuzi");
    expect(model.smsBody.toLowerCase()).not.toContain("pin");
    expect(model.smsBody.length).toBeLessThanOrEqual(306);
  });

  it("hands the SMS to the phone composer only with a dialable number", () => {
    const href = smsComposerHref("+255 712 345 678", model.smsBody);
    expect(href?.startsWith("sms:+255712345678?&body=")).toBe(true);
    expect(href?.startsWith("http")).toBe(false);
    const body = href?.slice(href.indexOf("body=") + 5);
    expect(decodeURIComponent(body ?? "")).toBe(model.smsBody);
    expect(smsComposerHref("", model.smsBody)).toBeNull();
    expect(smsComposerHref("call me", model.smsBody)).toBeNull();
  });

  it("starts referral tracking and the outbox", () => {
    const stored = toStored(model);
    expect(stored.referral_status).toBe("referred");
    expect(stored.sms_status).toBe("queued");
    expect(stored.caregiver_phone).toBe("");
  });
});

describe("handoff", () => {
  it("rejects a decision that is missing the level", () => {
    expect(parsePacket({ language: "sw", decision: { decision: "urgent_referral" } })).toBeNull();
  });

  it("reads a scanned passport and drops extra fields", () => {
    const text = JSON.stringify({
      passport_id: "CP-1042",
      timestamp: "2026-10-03T19:00:00Z",
      language: "sw",
      decision: "urgent_referral",
      facility: "Good Samaritan ACK Medical Clinic",
      reason: ["cannot_drink"],
      symptoms: { fever: true },
      pin: "1234",
    });
    const passport = parsePassport(text);
    expect(passport?.passport_id).toBe("CP-1042");
    expect(passport?.reason).toEqual(["cannot_drink"]);
    const again = passportJson(passport!);
    expect(again).not.toContain("fever");
    expect(again).not.toContain("1234");
  });

  it("uses the contract line for an out-of-scope decision", () => {
    const packet = parsePacket({
      language: "en",
      decision: {
        decision: "out_of_scope",
        level_so_far: "out_of_scope",
        classifications: [],
        reasons: [],
        fired_rules: [],
        required_care: [],
        follow_up_questions: [],
        citations: [],
        notes: [],
      },
      facility: null,
    });
    const model = present(packet!, "CP-2000", NOW);
    expect(model.action).toBe("This tool doesn't cover this case. See a clinician.");
  });

  it("shows follow-up questions instead of guessing", () => {
    const packet = parsePacket({
      language: "en",
      decision: {
        decision: "need_more_info",
        level_so_far: "urgent_referral",
        classifications: [],
        reasons: [],
        fired_rules: [],
        required_care: [],
        follow_up_questions: [{ question: "Is the child lethargic or unconscious?" }],
        citations: [],
        notes: [],
      },
    });
    const model = present(packet!, "CP-2001", NOW);
    expect(model.questions).toEqual(["Is the child lethargic or unconscious?"]);
    expect(model.passport.reason).toEqual([]);
  });
});

describe("crypto", () => {
  it("round-trips under the right PIN and fails under the wrong one", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey("1234", salt);
    const other = await deriveKey("9999", salt);
    const sealed = await encryptString(key, "encounter");
    expect(await decryptString(key, sealed.iv, sealed.ciphertext)).toBe("encounter");
    await expect(decryptString(other, sealed.iv, sealed.ciphertext)).rejects.toThrow();
  });

  it("accepts only a 4 to 6 digit PIN", () => {
    expect(pinIsValid("1234")).toBe(true);
    expect(pinIsValid("12")).toBe(false);
    expect(pinIsValid("abcd")).toBe(false);
  });
});
