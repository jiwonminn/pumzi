import { startCamera, stopCamera } from "./camera";
import { smsComposerHref } from "./copy";
import { pinIsValid } from "./crypto";
import {
  createPin,
  hasEncounter,
  listEncounters,
  pinExists,
  saveEncounter,
  unlock,
  updateEncounter,
} from "./db";
import {
  EXAMPLE_PASSPORT_ID,
  buildClinicalHandoff,
  handoffJson,
  loadHandoff,
  newPassportId,
  parseHandoff,
  parsePassport,
  present,
  toStored,
} from "./handoff";
import { decodeBlob, decodeDataUrl, toQrDataUrl } from "./qr";
import { SYMPTOM_KEYS } from "../core/src/types";
import type { ClinicalHandoff, ReferralStatus, ViewName } from "./types";
import { render, type PinPrompt, type Screen } from "./ui";

const loaded = loadHandoff(localStorage.getItem("pumzi.decision"));
const startedAt = new Date();

interface State {
  view: ViewName;
  passportId: string;
  pinSet: boolean;
  key: CryptoKey | null;
  encounters: Screen["encounters"];
  notice: string | null;
  alert: string | null;
  pin: (PinPrompt & { next: "save" | "history" | "outbox" }) | null;
  qrUrl: string | null;
  scanned: ClinicalHandoff | null;
  scanNote: string | null;
  scanQrUrl: string | null;
  cameraOn: boolean;
  busy: boolean;
}

const state: State = {
  view: "result",
  passportId: loaded.example ? EXAMPLE_PASSPORT_ID : newPassportId(),
  pinSet: false,
  key: null,
  encounters: null,
  notice: null,
  alert: null,
  pin: null,
  qrUrl: null,
  scanned: null,
  scanNote: null,
  scanQrUrl: null,
  cameraOn: false,
  busy: false,
};

function model() {
  return present(loaded.handoff, state.passportId, startedAt, loaded.example, loaded.clinicalCase);
}

function screen(): Screen {
  return {
    view: state.view,
    model: model(),
    qrUrl: state.qrUrl,
    unlocked: state.key !== null,
    pinSet: state.pinSet,
    encounters: state.encounters,
    notice: state.notice,
    alert: state.alert,
    pin: state.pin,
    scanned: state.scanned,
    scanNote: state.scanNote,
    scanQrUrl: state.scanQrUrl,
    cameraOn: state.cameraOn,
    busy: state.busy,
  };
}

let mount: HTMLElement | null = null;
let booted = false;

export function startHandoff(root: HTMLElement): void {
  mount = root;
  if (!booted) {
    booted = true;
    void boot();
    return;
  }
  draw();
}

function draw(): void {
  const root = mount;
  if (!root) return;
  if (!state.cameraOn) stopCamera();
  root.replaceChildren(render(screen(), handlers));
  const pinEntry = root.querySelector("#pin-entry");
  if (pinEntry instanceof HTMLInputElement) pinEntry.focus();
  if (state.cameraOn) {
    const video = root.querySelector("video");
    if (video instanceof HTMLVideoElement && !video.srcObject) {
      void startCamera(video, onCameraCode, onCameraError);
    }
  }
}

async function refresh(): Promise<void> {
  state.encounters = state.key ? await listEncounters(state.key) : null;
}

async function writeEncounter(): Promise<void> {
  if (!state.key) return;
  state.busy = true;
  draw();
  try {
    const record = toStored(model());
    const exists = await hasEncounter(record.passport.passport_id);
    if (exists) state.notice = "Already saved on this phone.";
    else {
      await saveEncounter(state.key, record);
      state.notice = "Saved. Locked behind the PIN.";
    }
    await refresh();
  } catch {
    state.alert = "Could not save on this phone.";
  } finally {
    state.busy = false;
    draw();
  }
}

const handlers = {
  go(view: ViewName) {
    state.cameraOn = false;
    state.alert = null;
    state.notice = null;
    if ((view === "history" || view === "outbox") && !state.key) {
      if (!state.pinSet) {
        state.view = "result";
        state.pin = { mode: "create", next: view, error: null };
        draw();
        return;
      }
      state.view = view;
      state.pin = { mode: "unlock", next: view, error: null };
      draw();
      return;
    }
    state.view = view;
    draw();
  },
  save() {
    state.notice = null;
    state.alert = null;
    if (!state.pinSet) {
      state.pin = { mode: "create", next: "save", error: null };
      draw();
      return;
    }
    if (!state.key) {
      state.pin = { mode: "unlock", next: "save", error: null };
      draw();
      return;
    }
    void writeEncounter();
  },
  lock() {
    state.key = null;
    state.encounters = null;
    state.cameraOn = false;
    if (state.view === "history" || state.view === "outbox") state.view = "result";
    state.notice = "Locked. Without the PIN these records cannot be read.";
    draw();
  },
  async submitPin(pin: string, confirm: string) {
    if (!state.pin) return;
    if (!pinIsValid(pin)) {
      state.pin = { ...state.pin, error: "Use 4 to 6 digits." };
      draw();
      return;
    }
    try {
      if (state.pin.mode === "create") {
        if (pin !== confirm) {
          state.pin = { ...state.pin, error: "PINs do not match." };
          draw();
          return;
        }
        state.key = await createPin(pin);
        state.pinSet = true;
      } else {
        const key = await unlock(pin);
        if (!key) {
          state.pin = { ...state.pin, error: "Wrong PIN. Records stay locked." };
          draw();
          return;
        }
        state.key = key;
      }
    } catch {
      state.alert = state.pin.mode === "create" ? "Could not set the PIN." : "Could not unlock this phone.";
      state.pin = null;
      draw();
      return;
    }
    const creating = state.pin.mode === "create";
    const next = state.pin.next;
    state.pin = null;
    await refresh();
    if (creating || next === "save") await writeEncounter();
    if (next === "history" || next === "outbox") {
      state.view = next;
      draw();
    }
  },
  cancelPin() {
    state.pin = null;
    draw();
  },
  async readQr() {
    if (!state.qrUrl) return;
    try {
      applyScan(await decodeDataUrl(state.qrUrl));
    } catch {
      applyScan(null);
    }
  },
  startCamera() {
    state.view = "scan";
    state.cameraOn = true;
    state.alert = null;
    draw();
  },
  async onFile(file: File) {
    try {
      applyScan(await decodeBlob(file));
    } catch {
      applyScan(null);
    }
  },
  async setStatus(id: string, status: ReferralStatus) {
    if (!state.key) return;
    await updateEncounter(state.key, id, (record) => {
      record.referral_status = status;
    });
    await refresh();
    state.notice = `Referral marked ${status.replaceAll("_", " ")}.`;
    draw();
  },
  async setPhone(id: string, phone: string) {
    if (!state.key) return;
    await updateEncounter(state.key, id, (record) => {
      record.caregiver_phone = phone.slice(0, 20);
    });
    await refresh();
    state.notice = "Phone number saved on this phone only.";
    draw();
  },
  async openSms(id: string, phone: string, body: string) {
    if (!state.key) return;
    const href = smsComposerHref(phone, body);
    if (!href) {
      state.alert = null;
      state.notice = "Enter a caregiver phone first.";
      draw();
      return;
    }
    const link = document.createElement("a");
    link.href = href;
    document.body.append(link);
    link.click();
    link.remove();
    await updateEncounter(state.key, id, (record) => {
      record.caregiver_phone = phone.trim().slice(0, 20);
      record.sms_status = "shown";
    });
    await refresh();
    state.alert = null;
    state.notice = "Opened in the messages app. This app did not send it.";
    draw();
  },
  async copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      state.notice = "Copied.";
    } catch {
      state.notice = "Copy failed. Read the ID aloud.";
    }
    draw();
  },
};

function applyScan(text: string | null): void {
  state.cameraOn = false;
  state.scanQrUrl = null;
  if (!text) {
    state.scanned = null;
    state.scanNote = "Could not read that code.";
    state.view = "scan";
    draw();
    return;
  }
  const passport = parseScanPayload(text);
  if (!passport) {
    state.scanned = null;
    state.scanNote = "This QR is not a Pumzi care passport.";
    state.view = "scan";
    draw();
    return;
  }
  state.scanned = passport;
  state.scanNote =
    passport.id === state.passportId
      ? "Code matches this passport."
      : "Passport read. The full record stays on the phone that made it.";
  state.view = "scan";
  draw();
  const scannedId = passport.id;
  void toQrDataUrl(text).then((url) => {
    if (state.scanned?.id !== scannedId) return;
    state.scanQrUrl = url;
    draw();
  });
}

function parseScanPayload(text: string): ClinicalHandoff | null {
  const handoff = parseHandoff(text);
  if (handoff) return handoff;
  const legacy = parsePassport(text);
  if (!legacy) return null;
  const priority =
    legacy.decision === "urgent_referral"
      ? "urgent"
      : legacy.decision === "referral"
        ? "referral"
        : legacy.decision === "treat_at_clinic"
          ? "clinic"
          : legacy.decision === "home_care"
            ? "home"
            : "unknown";
  return {
    v: 1,
    id: legacy.passport_id,
    created_at: legacy.timestamp,
    age_days: null,
    language: legacy.language,
    symptoms: Object.fromEntries(SYMPTOM_KEYS.map((key) => [key, null])),
    duration_days: null,
    symptom_days: {},
    breaths_per_minute: null,
    spo2_percent: null,
    referral: { priority, reasons: legacy.reason, destination: legacy.facility },
    confirmed_by_health_worker: false,
  };
}

function onCameraCode(text: string): void {
  applyScan(text);
}

function onCameraError(message: string): void {
  state.cameraOn = false;
  state.alert = message;
  draw();
}

async function boot(): Promise<void> {
  state.pinSet = await pinExists();
  state.qrUrl = await toQrDataUrl(handoffJson(buildClinicalHandoff(loaded.handoff, model().passport, loaded.clinicalCase)));
  draw();
}

const viteRoot = document.querySelector("#app");
if (viteRoot instanceof HTMLElement) startHandoff(viteRoot);
