# Pumzi

Offline pediatric danger-sign support for a frontline health worker. The caregiver's description, in English or Swahili, becomes a structured case. The WHO IMCI chart decides what it means. The result goes to a care handoff the worker can act on.

Supports referral. Does not diagnose. Does not replace a clinician.

**Live demo:** LINK GOES HERE. Try age 2 with "My child has a fever and cannot drink anything."

## Two ways it runs

| | Clinic laptop | Any phone, or the live link |
|---|---|---|
| Reads the description | NLLB-200 translates Swahili to English and Qwen2.5 reads the signs, both on the laptop's CPU (about 15 seconds) | A phrase matcher in the browser. No model, so it can't invent a symptom or a number |
| What it needs | 3.5 GB of models, side-loaded once, then fully offline | About 1 MB, saved on the first visit, then offline |
| Decision, clinic choice, handoff | Same code | Same code |

## Small AI

| Model | Job | Size | Licence |
|---|---|---|---|
| [facebook/nllb-200-distilled-600M](https://huggingface.co/facebook/nllb-200-distilled-600M) | Swahili to English | 2.4 GB | CC BY-NC 4.0 (non-commercial) |
| [Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF), Q4_K_M GGUF on llama.cpp | Reads the signs from the description | 1.1 GB | Apache 2.0 |

The models only read. They never decide: the WHO rules decide, after the health worker confirms every sign.

## Keeping the AI honest

- Every model reading is checked against the caregiver's words (`core/src/extract/guard.ts`). A number the text doesn't state is dropped. A "no" the text doesn't say becomes "not sure". A sign only the model saw is flagged for the worker. A real case: for "My child has a cough and is breathing fast", Qwen returned 30 breaths per minute and 95% oxygen. Neither is in the sentence, so both were dropped, and the screen lists them under "Not used from the local AI".
- The health worker confirms each sign (yes, no or not sure) before anything is decided.
- Unknown is never treated as no. If an unanswered sign could make the result more serious, the app asks the WHO question. An urgent referral never waits for questions.
- Outside the chart's ages (under 2 months, 5 years and over), it says so instead of guessing.
- Patient data stays on the device. Saved records are encrypted behind a PIN (PBKDF2, AES-GCM). The care passport QR holds six fields and no name.

## Grounded in the WHO chart

- 15 rules from the WHO IMCI Chart Booklet (2014), pages 5 to 8: general danger signs, cough or difficult breathing, diarrhoea and fever. Each rule carries the booklet's own words and page, and the result screen shows them. A test checks every quote word for word against the booklet text.
- The engine doesn't know about IMCI. The chart is one protocol file (`core/src/rules/who-imci.ts`), so a country's adapted chart is a new file on the same engine and tests.

**What it doesn't cover.** Young infants under 2 months, children 5 and older, ear problems, malnutrition and anaemia, HIV status, measles, and treatment or doses. It treats every fever case as high malaria risk, as the chart does in high-risk areas. The facility list is made up for the demo. The Swahili phrases and caregiver lines are drafts that a Swahili speaker still needs to check. NLLB can add details that aren't there: it translated "mtoto wangu" (my child) as "my son".

## Evidence

- 103 decision-layer tests, covering the rules, every WHO quote, the AI check, the phrase matcher and the whole pipeline, plus 11 handoff tests.
- 20,000 random cases through the handoff's parser: every final result was accepted.
- End to end by hand: a Swahili description through the local AI gave an urgent referral to the closest clinic with emergency care for children. A cough with 45 breaths a minute at age 2 gave pneumonia, treat at the clinic. With the server switched off, the saved app opened and ran a full case to the handoff.

## How it fits together

1. **Intake** (`app/page.tsx`, `components/`). The worker types what the caregiver says. On a laptop running the local backend, NLLB translates and Qwen reads the description. Anywhere else, a phrase matcher in the browser reads it. It has no model, so it can't invent a symptom or a number.
2. **Check** (`core/src/extract/guard.ts`). A model reading is checked against the words in the description. A number the text doesn't state is dropped. A "no" the text doesn't say becomes "not sure". The worker then confirms every sign before anything is decided.
3. **Decision layer** (`core/`). WHO IMCI rules from the Chart Booklet (2014), pages 5 to 8. Unknown is never treated as no: the engine asks follow-up questions until it can decide, then picks the nearest facility that offers the care needed.
4. **Care handoff** (`/handoff`, `src/`). Result screen, care passport QR and encrypted encounter store.

## Offline

On the hosted link, a service worker (`public/sw.js`) saves the app on the device the first time it opens with internet: both pages and every build file listed at `/sw-assets`. After that it opens with no internet. The phrase matcher, the WHO rules, facility matching and the handoff all run in the browser. The local AI only runs on a laptop with the backend.

It's off under `npm run dev`, so it never hides code changes. To test it, run `npm run build`, then `npx next start -p 3001`, and open http://localhost:3001 in Chrome. DevTools > Application > Service workers should show it activated. Then tick Offline in the Network tab, or stop the server, and reload.

## Intake and local AI

Pumzi is an offline-first pediatric clinic intake tool. The Next.js frontend
communicates with a local FastAPI backend for Swahili-to-English translation and
clinical-factor extraction.

### Requirements

- Node.js 22.12 or newer (Vitest 5 needs it)
- Python 3.11 or newer
- Several gigabytes of disk space for the local AI models

### Setup on macOS/Linux

Clone the repository and enter its directory:

```bash
git clone <repository-url>
cd pumzi
```

#### 1. Install frontend dependencies

```bash
npm install
```

#### 2. Create the Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

On later runs, activate the existing environment:

```bash
source .venv/bin/activate
```

#### 3. Download the local models

Run this once:

```bash
python backend/setup_models.py
```

### Setup on Windows

Open PowerShell, clone the repository, and enter its directory:

```powershell
git clone <repository-url>
cd pumzi
```

#### 1. Install frontend dependencies

```powershell
npm install
```

#### 2. Create the Python environment

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

If PowerShell blocks activation scripts, run PowerShell as your user and then
retry:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Or skip activation and call the environment's Python directly, for example
`.\.venv\Scripts\python -m pip install -r backend\requirements.txt`.

#### 3. Download the local models

```powershell
python backend\setup_models.py
```

The setup script downloads:

- `facebook/nllb-200-distilled-600M` to
  `backend/models/huggingface/nllb-200-distilled-600M`
- `qwen2.5-1.5b-instruct-q4_k_m.gguf` to
  `backend/models/qwen`

The model files are ignored by Git and are not downloaded during normal
application runtime.

### Run the application

#### macOS/Linux

Start the backend in one terminal:

```bash
source .venv/bin/activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Verify the backend:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

Start the frontend in a second terminal:

```bash
npm run dev
```

#### Windows PowerShell

Start the backend in one PowerShell window:

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

In a second PowerShell window, start the frontend:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Test the workflow

For English, select **English** and enter:

```text
My child is two years old, has a fever, and cannot drink.
```

For Swahili, select **Swahili** and enter:

```text
Mtoto wangu ana miaka miwili. Ana homa na hawezi kunywa tangu jana.
```

The Swahili workflow runs locally as:

```text
Swahili → NLLB translation → English → clinical-factor extraction
```

The first request can take longer while the models load into memory. Later
requests reuse the loaded models.

### Offline behavior

After model setup completes, inference runs through the local FastAPI process.
The application does not use OpenAI, Ollama, or cloud inference APIs.

See [backend/README.md](backend/README.md) for backend-specific details.

## Decision layer

`core/` is plain TypeScript with no dependencies. It runs the same way in the browser, on a laptop or in tests.

- `core/src/types.ts`: the shared data formats every layer reads.
- `core/src/rules/`: the WHO IMCI rules and the engine. Every rule carries its quote and page from the chart booklet, and a test checks each quote word for word against the booklet text.
- `core/src/case/`: checks a case before it reaches the rules, and records follow-up answers.
- `core/src/extract/`: the phrase matcher and the check on model readings.
- `core/src/navigation/`: picks the facility. The facility list in `demo-facilities.ts` is made up for the demo.

```bash
npm run test:core
```

## Care handoff

Offline result screen, care passport, and encrypted encounter store for a frontline health worker.

This layer takes a **decision** from the rules engine and turns it into something the worker can act on, hand to the next clinic, and keep on the phone. It does not read symptoms, apply WHO rules, or pick a facility. Those belong to the other layers. Shared types live in `core/src/types.ts`.

### Run

```bash
npm install
npm test
npm run dev:output
```

`npm run dev` opens the intake. After an assessment the app saves the decision and opens the handoff at `/handoff`. `npm run dev:output` runs the same screen through Vite. `npm run test:core` runs the decision-layer tests.

Opened with no saved decision, the handoff shows the hard-coded example:

- Urgent referral recommended
- Reason: Not able to drink or breastfeed
- Destination: District Clinic B
- Action: Please go to the recommended facility.
- SMS ID: `CP-1042`

No network call after the page loads. Records stay in this browser.

### What you can do

1. Read the result, the Swahili line for the caregiver, and the SMS ID.
2. **Read this code** decodes the QR just drawn, to prove the passport scans.
3. **Use camera** or choose a photo on the Scan tab for a code from another phone.
4. **Save on this phone** sets a 4–6 digit PIN and stores the encounter with AES-GCM. The key never leaves the page. Reload locks it again.
5. History tracks the referral: Referred, Arrived, Follow-up done.
6. Outbox holds a fixed SMS. **Open in messages** fills the phone's own composer. The app does not send the message.

### Handoff

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

### Care passport

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

### Swahili

Caregiver lines and the queued SMS are fixed drafts, not generated text. A Swahili speaker still needs to check them before a real demo. The worker card stays in English so it matches the architecture diagram.

### Privacy

- PIN → PBKDF2 (100,000 iterations, SHA-256) → AES-GCM.
- IndexedDB stores ciphertext only.
- Lock drops the key from memory.
- A lost or shared phone cannot show History or the outbox without the PIN.
- The QR is the intentional, minimal handoff. It is readable by design.

### Not in this layer

- Language understanding, danger-sign rules, and facility matching.
- A service worker. The app shell owns offline caching.
- DHIS2. Nothing is uploaded. Sync stays off until a relay exists. The outbox is the local queue.

### Tests

`npm test` checks the example wording, the six-field passport, the SMS ID, out-of-scope copy, and that the wrong PIN cannot decrypt.
