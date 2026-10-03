# Pumzi — care handoff

Offline result screen, care passport, and encrypted encounter store for a frontline health worker.

This layer takes a **decision** from the rules engine and turns it into something the worker can act on, hand to the next clinic, and keep on the phone. It does not read symptoms, apply WHO rules, or pick a facility. Those belong to the other layers. Shared types live in `core/src/types.ts`.

Supports referral. Does not diagnose. Does not replace a clinician.

## Run

```bash
npm install
npm test
npm run dev:output
```

`npm run dev` opens the care handoff in the Next.js app. It still uses the hard-coded example until the decision layer is connected. `npm run dev:output` runs the same screen through Vite. `npm run test:core` runs the decision-layer tests.

Open the handoff URL. The first screen is the hard-coded example:

- Urgent referral recommended
- Reason: Not able to drink or breastfeed
- Destination: District Clinic B
- Action: Please go to the recommended facility.
- SMS ID: `CP-1042`

No network call after the page loads. Records stay in this browser.

## What you can do

1. Read the result, the Swahili line for the caregiver, and the SMS ID.
2. **Read this code** decodes the QR just drawn, to prove the passport scans.
3. **Use camera** or choose a photo on the Scan tab for a code from another phone.
4. **Save on this phone** sets a 4–6 digit PIN and stores the encounter with AES-GCM. The key never leaves the page. Reload locks it again.
5. History tracks the referral: Referred, Arrived, Follow-up done.
6. Outbox holds a fixed SMS. **Open in messages** fills the phone's own composer. The app does not send the message.

## Handoff

This layer reads the interface contract: a `Decision` from the rules engine, a `FacilityRecommendation` from care navigation, and `language` from the structured case. It does not classify signs.

Save this JSON in `localStorage` under `pumzi.decision`, then reload. If it is missing or invalid, the example above is shown. The same object is in `shared/example-output.json`. Core owns the type names in `core/src/types.ts`. This layer mirrors them and does not change them.

```json
{
  "language": "sw",
  "decision": {
    "decision": "urgent_referral",
    "level_so_far": "urgent_referral",
    "classifications": ["VERY SEVERE DISEASE"],
    "reasons": ["Not able to drink or breastfeed"],
    "fired_rules": ["IMCI-GDS-01"],
    "required_care": ["pediatric_emergency"],
    "follow_up_questions": [],
    "citations": [],
    "notes": []
  },
  "facility": {
    "facility_id": "fac-003",
    "name": "District Clinic B",
    "matched_services": ["pediatric_emergency", "iv_rehydration"],
    "missing_services": [],
    "distance_km": 7.4,
    "why": "Closest facility in the offline list that offers everything needed (7.4 km)."
  }
}
```

`decision.decision` is one of `urgent_referral`, `referral`, `treat_at_clinic`, `home_care`, `need_more_info`, `out_of_scope`, `safe_fallback`.

`need_more_info` shows each `follow_up_questions[].question`. `safe_fallback` and `out_of_scope` use the contract sentences. A citation quote is shown with its source and page.

## Care passport

The QR is only these six fields. `reason` is symptom keys, not free text.

```json
{
  "passport_id": "CP-1042",
  "timestamp": "2026-10-03T19:00:00Z",
  "language": "sw",
  "decision": "urgent_referral",
  "facility": "District Clinic B",
  "reason": ["cannot_drink"]
}
```

The next clinic can read that without the PIN. The PIN protects the saved encounter, the phone number, and the referral status. Do not put a name, a PIN, or the full symptom list in the code.

`passport_id` is the SMS ID for a basic phone (`CP-` plus four digits). The example keeps `CP-1042`. A live decision gets a new ID.

## Swahili

Caregiver lines and the queued SMS are fixed drafts, not generated text. A Swahili speaker still needs to check them before a real demo. The worker card stays in English so it matches the architecture diagram.

## Privacy

- PIN → PBKDF2 (100,000 iterations, SHA-256) → AES-GCM.
- IndexedDB stores ciphertext only.
- Lock drops the key from memory.
- A lost or shared phone cannot show History or the outbox without the PIN.
- The QR is the intentional, minimal handoff. It is readable by design.

## Not in this layer

- Language understanding, danger-sign rules, and facility matching.
- A service worker. The app shell owns offline caching.
- DHIS2. Nothing is uploaded. Sync stays off until a relay exists. The outbox is the local queue.

## Tests

`npm test` checks the example wording, the six-field passport, the SMS ID, out-of-scope copy, and that the wrong PIN cannot decrypt.
