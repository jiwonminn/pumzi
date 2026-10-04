import { TITLES, careNeedLabel, reasonLabel, smsComposerHref } from "./copy";
import { SYMPTOM_LABELS } from "../core/src/rules/who-imci";
import type { ClinicalHandoff, ReferralStatus, ResultModel, StoredEncounter, ViewName } from "./types";

export interface PinPrompt {
  mode: "create" | "unlock";
  error: string | null;
}

export interface Screen {
  view: ViewName;
  model: ResultModel;
  qrUrl: string | null;
  unlocked: boolean;
  encounters: StoredEncounter[] | null;
  notice: string | null;
  alert: string | null;
  pin: PinPrompt | null;
  scanned: ClinicalHandoff | null;
  scanNote: string | null;
  cameraOn: boolean;
  busy: boolean;
}

export interface Handlers {
  go: (view: ViewName) => void;
  save: () => void;
  lock: () => void;
  submitPin: (pin: string, confirm: string) => void;
  cancelPin: () => void;
  readQr: () => void;
  startCamera: () => void;
  onFile: (file: File) => void;
  setStatus: (id: string, status: ReferralStatus) => void;
  setPhone: (id: string, phone: string) => void;
  openSms: (id: string, phone: string, body: string) => void;
  copy: (text: string) => void;
}

const STATUS_LABEL: Record<ReferralStatus, string> = {
  referred: "Referred",
  arrived: "Arrived",
  follow_up_done: "Follow-up done",
};

const LANGUAGE_LABEL: Record<string, string> = {
  sw: "Swahili",
  en: "English",
};

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | null | undefined>,
  kids: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null) continue;
    if (key === "class") node.className = value;
    else node.setAttribute(key, value);
  }
  for (const kid of kids) node.append(kid);
  return node;
}

function tone(decision: string): string {
  if (decision === "urgent_referral") return "urgent";
  if (decision === "referral" || decision === "treat_at_clinic") return "treat";
  if (decision === "home_care") return "home";
  return "scope";
}

function field(label: string, value: string): HTMLElement {
  return h("div", { class: "row" }, [
    h("dt", {}, [label]),
    h("dd", {}, [value]),
  ]);
}

function icon(label: string): HTMLElement {
  return h("span", { class: "card-icon", "aria-hidden": "true" }, [label]);
}

function ageText(ageDays: number | null): string {
  if (ageDays == null) return "Age not recorded";
  if (ageDays >= 365) {
    const years = Math.floor(ageDays / 365);
    return `Age: ${years} ${years === 1 ? "year" : "years"}`;
  }
  const months = Math.max(1, Math.round(ageDays / 30.4));
  return `Age: ${months} ${months === 1 ? "month" : "months"}`;
}

function issuedText(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function symptomLabel(code: string): string {
  return SYMPTOM_LABELS[code as keyof typeof SYMPTOM_LABELS] ?? reasonLabel(code, "en");
}

function priorityLabel(decision: string): string {
  if (decision === "urgent_referral") return "URGENT";
  if (decision === "referral") return "REFERRAL";
  if (decision === "treat_at_clinic") return "CLINIC CARE";
  if (decision === "home_care") return "HOME CARE";
  return "REVIEW";
}

function resultView(screen: Screen, handlers: Handlers): HTMLElement[] {
  const { model } = screen;
  const findings = model.passport.reason.slice(0, 3).map(symptomLabel);
  const card = h("section", { id: "referral-card", class: `referral-card ${tone(model.passport.decision)}` }, [
    h("header", { class: "referral-card-header" }, [
      h("div", { class: "referral-brand" }, [icon("+"), h("div", {}, [h("p", { class: "referral-eyebrow" }, ["Pumzi clinic handoff"]), h("h1", {}, ["REFERRAL CARE CARD"])])]),
      h("span", { class: `urgency-badge ${model.passport.decision === "urgent_referral" ? "urgent" : ""}` }, [priorityLabel(model.passport.decision)]),
    ]),
    h("div", { class: "referral-card-body" }, [
      h("div", { class: "referral-main" }, [
        h("div", { class: "patient-line" }, [icon("P"), h("strong", {}, [ageText(model.clinicalCase?.age_days ?? null)])]),
        h("section", { class: "finding-panel" }, [
          h("h2", {}, ["Key findings"]),
          findings.length ? h("ul", {}, findings.map((finding) => h("li", {}, [finding]))) : h("p", { class: "card-muted" }, ["No positive finding recorded"]),
        ]),
        h("section", { class: "destination-panel" }, [
          h("p", { class: "card-label" }, ["Go to"]),
          h("p", { class: "destination-name" }, [icon("+"), model.destination ?? "Receiving clinic"]),
        ]),
      ]),
      h("div", { class: "referral-qr-column" }, [
        h("div", { class: "issued-row" }, [h("span", {}, ["Issued"]), h("strong", {}, [issuedText(model.passport.timestamp)])]),
        h("p", { class: `verified ${model.clinicalCase?.confirmed_by_health_worker ? "" : "unverified"}` }, [model.clinicalCase?.confirmed_by_health_worker ? "OK  Reviewed by health worker" : "Review pending"]),
        screen.qrUrl ? h("img", { class: "qr referral-qr", src: screen.qrUrl, alt: "QR code for full clinical handoff" }) : h("div", { class: "qr-placeholder" }, ["QR loading"]),
        h("p", { class: "qr-caption" }, ["Scan for full clinical handoff"]),
        h("p", { class: "referral-id" }, [`Referral ID: ${model.passport.passport_id}`]),
      ]),
    ]),
    h("footer", { class: "instruction-bar" }, [icon("!"), h("div", {}, [h("strong", {}, ["SHOW THIS CARD ON ARRIVAL"]), h("span", {}, ["ONYESHA KADI HII UKIFIKA"])])]),
  ]);
  if (screen.qrUrl) {
    card.setAttribute("data-qr-ready", "true");
  }
  const row = h("div", { class: "actions print-controls" });
  const print = h("button", { class: "primary", type: "button" }, ["Print card"]);
  print.onclick = () => window.print();
  const copyId = h("button", { class: "ghost", type: "button" }, ["Copy SMS ID"]);
  copyId.onclick = () => handlers.copy(model.passport.passport_id);
  const read = h("button", { class: "ghost", type: "button" }, ["Read this code"]);
  read.onclick = () => handlers.readQr();
  row.append(print, copyId, read);
  return [h("div", { class: "referral-view" }, [card, row])];
}

function historyView(screen: Screen, handlers: Handlers): HTMLElement[] {
  if (!screen.unlocked) {
    return [h("section", { class: "panel" }, [h("h2", {}, ["Encounter history"]), h("p", {}, ["Unlock with the PIN."])])];
  }
  const records = screen.encounters ?? [];
  if (records.length === 0) {
    return [h("section", { class: "panel" }, [h("h2", {}, ["Encounter history"]), h("p", {}, ["Nothing saved on this phone yet."])])];
  }
  return records.map((record) => {
    const card = h("article", { class: "item" }, [
      h("p", { class: "badge" }, [STATUS_LABEL[record.referral_status]]),
      h("h2", {}, [record.passport.passport_id]),
      h("p", {}, [TITLES[record.passport.decision]]),
      h("p", {}, [record.passport.facility]),
      h("p", { class: "note" }, [record.reason_text]),
    ]);
    const row = h("div", { class: "actions" });
    for (const status of ["arrived", "follow_up_done", "referred"] as const) {
      const button = h("button", { class: "ghost", type: "button" }, [STATUS_LABEL[status]]);
      button.disabled = record.referral_status === status;
      button.onclick = () => handlers.setStatus(record.passport.passport_id, status);
      row.append(button);
    }
    card.append(row);
    return card;
  });
}

function outboxView(screen: Screen, handlers: Handlers): HTMLElement[] {
  if (!screen.unlocked) {
    return [h("section", { class: "panel" }, [h("h2", {}, ["SMS outbox"]), h("p", {}, ["Unlock with the PIN."])])];
  }
  const records = screen.encounters ?? [];
  if (records.length === 0) {
    return [h("section", { class: "panel" }, [h("h2", {}, ["SMS outbox"]), h("p", {}, ["No message queued."])])];
  }
  return records.map((record) => {
    const card = h("article", { class: "item" }, [
      h("h2", {}, [record.passport.passport_id]),
      h("p", {}, [
        record.sms_status === "queued"
          ? "Queued on this phone. Not sent."
          : "Handed to the messages app. This app did not send it.",
      ]),
    ]);
    const body = h("textarea", { readonly: "true" }, [record.sms_body]);
    card.append(body);
    const label = h("label", {}, ["Caregiver phone, stored only on this phone"]);
    label.htmlFor = `phone-${record.passport.passport_id}`;
    const phone = h("input", {
      id: `phone-${record.passport.passport_id}`,
      type: "tel",
      value: record.caregiver_phone,
      autocomplete: "off",
    });
    phone.onchange = () => handlers.setPhone(record.passport.passport_id, phone.value);
    card.append(label, phone);
    const row = h("div", { class: "actions" });
    const copy = h("button", { class: "ghost", type: "button" }, ["Copy message"]);
    copy.onclick = () => handlers.copy(record.sms_body);
    const open = h("button", { class: "primary", type: "button" }, ["Open in messages"]);
    const allowOpen = () => {
      open.disabled = smsComposerHref(phone.value, record.sms_body) === null;
    };
    allowOpen();
    phone.oninput = () => allowOpen();
    open.onmousedown = (event) => event.preventDefault();
    open.onclick = () => handlers.openSms(record.passport.passport_id, phone.value, record.sms_body);
    row.append(copy, open);
    card.append(row);
    return card;
  });
}

function scanView(screen: Screen, handlers: Handlers): HTMLElement[] {
  const panel = h("section", { class: "panel" }, [
    h("h2", {}, ["Scan a passport"]),
    h("p", { class: "note" }, ["The next clinic can read this code. It is not the full record."]),
  ]);
  if (screen.cameraOn) {
    panel.append(h("video", { playsinline: "true", muted: "true" }));
  }
  const row = h("div", { class: "actions" });
  const camera = h("button", { class: "primary", type: "button" }, ["Use camera"]);
  camera.onclick = () => handlers.startCamera();
  const file = h("input", { id: "passport-photo", class: "sr", type: "file", accept: "image/*" });
  file.onchange = () => {
    const chosen = file.files?.[0];
    if (chosen) handlers.onFile(chosen);
  };
  row.append(camera, h("label", { class: "ghost", for: "passport-photo" }, ["Photo of a code"]), file);
  panel.append(row);
  const nodes = [panel];
  if (screen.scanNote) nodes.push(h("p", { class: "notice" }, [screen.scanNote]));
  if (screen.scanned) {
    const scanned = screen.scanned;
    const present = Object.entries(scanned.symptoms).filter(([, value]) => value === true).map(([key]) => symptomLabel(key));
    const denied = Object.entries(scanned.symptoms).filter(([, value]) => value === false).map(([key]) => symptomLabel(key));
    const unknown = Object.entries(scanned.symptoms).filter(([, value]) => value === null).map(([key]) => symptomLabel(key));
    const symptoms = (title: string, values: string[]) => h("div", { class: "scan-group" }, [h("h3", {}, [title]), values.length ? h("ul", {}, values.map((value) => h("li", {}, [value]))) : h("p", { class: "card-muted" }, ["None recorded"])]);
    nodes.push(
      h("section", { class: "panel scan-result" }, [
        h("p", { class: "kicker" }, ["Scanned passport"]),
        h("h2", {}, [`Referral ${scanned.id}`]),
        h("dl", {}, [
          field("Referral", `${scanned.referral.priority} - ${scanned.referral.destination}`),
          field("Issued", issuedText(scanned.created_at)),
          field("Age", ageText(scanned.age_days)),
          field("Duration", scanned.duration_days == null ? "Unknown" : `${scanned.duration_days} days`),
          field("Vitals", `Breaths: ${scanned.breaths_per_minute ?? "unknown"}; SpO2: ${scanned.spo2_percent == null ? "unknown" : `${scanned.spo2_percent}%`}`),
          field("Health worker", scanned.confirmed_by_health_worker ? "Verified" : "Not verified"),
        ]),
        h("div", { class: "scan-groups" }, [symptoms("Present", present), symptoms("Denied", denied), symptoms("Unknown / not assessed", unknown)]),
      ]),
    );
  }
  return nodes;
}

export function render(screen: Screen, handlers: Handlers): HTMLElement {
  const page = h("div", {});
  const top = h("header", { class: "top" }, [
    h("div", { class: "brand" }, [
      h("div", {}, [
        h("p", { class: "brand-name" }, ["Pumzi"]),
        h("p", { class: "brand-sub" }, ["Care handoff"]),
      ]),
    ]),
  ]);
  if (screen.unlocked) {
    const lock = h("button", { class: "lock", type: "button" }, ["Lock"]);
    lock.onclick = () => handlers.lock();
    top.append(lock);
  } else {
    top.append(
      h("p", { class: "saved" }, [h("span", { class: "saved-dot", "aria-hidden": "true" }), "Saved on this device"]),
    );
  }
  page.append(top);
  if (screen.notice) page.append(h("p", { class: "notice", role: "status" }, [screen.notice]));
  if (screen.alert) page.append(h("p", { class: "alert", role: "alert" }, [screen.alert]));

  const body =
    screen.view === "history"
      ? historyView(screen, handlers)
      : screen.view === "outbox"
        ? outboxView(screen, handlers)
        : screen.view === "scan"
          ? scanView(screen, handlers)
          : resultView(screen, handlers);
  for (const node of body) page.append(node);
  page.append(
    h("p", { class: "disclaimer" }, [
      "Supports referral. Does not diagnose. Does not replace a clinician.",
    ]),
  );

  const nav = h("nav", { class: "nav" });
  const tabs: [ViewName, string][] = [
    ["result", "Result"],
    ["history", "History"],
    ["outbox", "Outbox"],
    ["scan", "Scan"],
  ];
  for (const [view, label] of tabs) {
    const button = h("button", { type: "button" }, [label]);
    if (screen.view === view) button.setAttribute("aria-current", "page");
    button.onclick = () => handlers.go(view);
    nav.append(button);
  }
  page.append(nav);

  if (screen.pin) {
    const prompt = screen.pin;
    const form = h("form", { class: "sheet" });
    form.append(h("h2", {}, [prompt.mode === "create" ? "Set a PIN" : "Unlock"]));
    form.append(
      h("p", { class: "note" }, [
        prompt.mode === "create"
          ? "4 to 6 digits. This phone cannot read saved encounters without it."
          : "Wrong PIN leaves the records unreadable.",
      ]),
    );
    if (prompt.error) form.append(h("p", { class: "alert", role: "alert" }, [prompt.error]));
    const pin = h("input", {
      id: "pin-entry",
      type: "password",
      inputmode: "numeric",
      autocomplete: "off",
      maxlength: "6",
    });
    pin.required = true;
    form.append(h("label", { for: "pin-entry" }, ["PIN"]), pin);
    let confirm: HTMLInputElement | null = null;
    if (prompt.mode === "create") {
      confirm = h("input", {
        id: "pin-confirm",
        type: "password",
        inputmode: "numeric",
        autocomplete: "off",
        maxlength: "6",
      });
      confirm.required = true;
      form.append(h("label", { for: "pin-confirm" }, ["Confirm PIN"]), confirm);
    }
    const row = h("div", { class: "actions" });
    const cancel = h("button", { class: "ghost", type: "button" }, ["Cancel"]);
    cancel.onclick = () => handlers.cancelPin();
    const submit = h("button", { class: "primary", type: "submit" }, [
      prompt.mode === "create" ? "Set PIN" : "Unlock",
    ]);
    row.append(cancel, submit);
    form.append(row);
    form.onsubmit = (event) => {
      event.preventDefault();
      handlers.submitPin(pin.value, confirm?.value ?? "");
    };
    page.append(h("div", { class: "modal" }, [form]));
  }
  return page;
}
