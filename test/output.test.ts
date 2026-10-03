import { describe, expect, it } from "vitest";
import { smsComposerHref } from "../src/copy";
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

  it("shows the contract example", () => {
    expect(model.title).toBe("Urgent referral recommended");
    expect(model.reasons).toEqual(["Not able to drink or breastfeed"]);
    expect(model.destination).toBe("District Clinic B");
    expect(model.action).toBe("Please go to the recommended facility.");
    expect(model.facilityWhy).toContain("7.4 km");
    expect(model.citations[0]?.pdf_page).toBe(5);
    expect(model.passport.passport_id).toBe("CP-1042");
    expect(model.caregiverLine).toContain("Hawezi kunywa");
    expect(model.caregiverLine).toContain("District Clinic B");
    expect(model.notes).toEqual([]);
    expect(model.soFar).toBeNull();
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
      facility: "District Clinic B",
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

  it("keeps a very slow skin pinch on the passport using the decision-layer label", () => {
    const packet = parsePacket({
      language: "en",
      decision: {
        decision: "urgent_referral",
        level_so_far: "urgent_referral",
        classifications: ["SEVERE DEHYDRATION"],
        reasons: ["Skin pinch goes back very slowly", "Sunken eyes"],
        fired_rules: ["IMCI-DIARR-01"],
        required_care: ["iv_rehydration"],
        follow_up_questions: [],
        citations: [],
        notes: ["If chest indrawing in HIV exposed/infected child, give first dose of amoxicillin and refer."],
      },
      facility: null,
    });
    const model = present(packet!, "CP-3001", NOW);
    expect(model.passport.reason).toEqual(["skin_pinch_very_slow", "sunken_eyes"]);
    expect(model.notes).toEqual([
      "If chest indrawing in HIV exposed/infected child, give first dose of amoxicillin and refer.",
    ]);
    expect(model.soFar).toBeNull();
    expect(toStored(model).notes).toEqual(model.notes);
  });

  it("shows what already fired while more questions remain", () => {
    const packet = parsePacket({
      language: "en",
      decision: {
        decision: "need_more_info",
        level_so_far: "referral",
        classifications: ["COUGH FOR MORE THAN 14 DAYS"],
        reasons: ["Cough for 16 days"],
        fired_rules: ["IMCI-COUGH-04"],
        required_care: ["clinician"],
        follow_up_questions: [
          { field: "breaths_per_minute", question: "Count the breaths in one minute. The child must be calm." },
        ],
        citations: [],
        notes: [],
      },
    });
    const model = present(packet!, "CP-3002", NOW);
    expect(model.questions).toEqual(["Count the breaths in one minute. The child must be calm."]);
    expect(model.soFar).toBe("Referral");
    expect(model.passport.decision).toBe("need_more_info");
    expect(model.passport.reason).toEqual([]);
  });

  it("does not repeat the action sentence as guidance", () => {
    const packet = parsePacket({
      language: "en",
      decision: {
        decision: "out_of_scope",
        level_so_far: null,
        classifications: [],
        reasons: ["The child's age is outside what this tool covers."],
        fired_rules: [],
        required_care: [],
        follow_up_questions: [],
        citations: [],
        notes: ["This tool doesn't cover this case. See a clinician."],
      },
      facility: null,
    });
    const model = present(packet!, "CP-3003", NOW);
    expect(model.action).toBe("This tool doesn't cover this case. See a clinician.");
    expect(model.notes).toEqual([]);
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
