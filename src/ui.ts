import { TITLES, careNeedLabel, reasonLabel, smsComposerHref } from "./copy";
import type { Passport, ReferralStatus, ResultModel, StoredEncounter, ViewName } from "./types";

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
  scanned: Passport | null;
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

function resultView(screen: Screen, handlers: Handlers): HTMLElement[] {
  const { model } = screen;
  const nodes: HTMLElement[] = [];
  if (model.example) {
    nodes.push(
      h("p", { class: "example" }, [
        "Hard-coded example. The decision layer is not connected yet.",
      ]),
    );
  }
  const facts = h("dl", {});
  if (model.reasons.length) facts.append(field("Reason", model.reasons.join("; ")));
  if (model.destination) facts.append(field("Destination", model.destination));
  facts.append(field("Action", model.action));
  const banner = h("section", { class: `banner ${tone(model.passport.decision)}` }, [
    h("p", { class: "kicker" }, ["Referral"]),
    h("h1", {}, [model.title]),
    facts,
  ]);
  if (model.facilityWhy) banner.append(h("p", { class: "why" }, [model.facilityWhy]));
  if (model.matchedServices.length) {
    banner.append(h("p", { class: "why" }, [`Services: ${model.matchedServices.map(careNeedLabel).join(", ")}`]));
  }
  const main = h("div", { class: "stack" });
  main.append(banner);
  if (model.questions.length) {
    const ask = h("section", { class: "panel" }, [h("h2", {}, ["Ask the caregiver"])]);
    for (const question of model.questions) ask.append(h("p", {}, [question]));
    main.append(ask);
  }
  if (model.citations.length) {
    const why = h("section", { class: "panel" }, [h("h2", {}, ["Why"])]);
    for (const citation of model.citations) {
      why.append(h("p", { class: "quote" }, [`"${citation.quote}"`]));
      why.append(h("p", { class: "note" }, [`${citation.source}, page ${citation.pdf_page}. ${citation.rule_id}`]));
    }
    main.append(why);
  }

  if (model.caregiverLine) {
    main.append(
      h("section", { class: "panel" }, [
        h("h2", {}, ["Tell the caregiver"]),
        h("p", {}, [model.caregiverLine]),
        h("p", { class: "draft" }, ["Swahili draft. A speaker still needs to check this line."]),
      ]),
    );
  }

  const passport = h("section", { class: "panel" }, [
    h("h2", {}, ["Care passport"]),
    h("p", { class: "note" }, ["Minimal code for the next clinic. No name. No PIN."]),
    h("p", { class: "kicker" }, ["SMS ID for a basic phone"]),
    h("p", { class: "sms-id" }, [model.passport.passport_id]),
  ]);
  if (screen.qrUrl) {
    passport.append(
      h("img", { class: "qr", src: screen.qrUrl, alt: "Care passport QR" }),
    );
  }
  const row = h("div", { class: "actions" });
  const copyId = h("button", { class: "ghost", type: "button" }, ["Copy SMS ID"]);
  copyId.onclick = () => handlers.copy(model.passport.passport_id);
  const read = h("button", { class: "ghost", type: "button" }, ["Read this code"]);
  read.onclick = () => handlers.readQr();
  const save = h("button", { class: "primary", type: "button" }, [
    screen.busy ? "Saving…" : "Save on this phone",
  ]);
  save.disabled = screen.busy;
  save.onclick = () => handlers.save();
  row.append(copyId, read, save);
  passport.append(row);
  nodes.push(h("div", { class: "columns" }, [main, passport]));
  return nodes;
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
    nodes.push(
      h("section", { class: `banner ${tone(scanned.decision)}` }, [
        h("p", { class: "kicker" }, ["Scanned passport"]),
        h("h1", {}, [TITLES[scanned.decision]]),
        h("dl", {}, [
          field("Reason", scanned.reason.map((code) => reasonLabel(code, "en")).join("; ")),
          field("Destination", scanned.facility),
          field("Time", scanned.timestamp),
          field("Language", LANGUAGE_LABEL[scanned.language] ?? scanned.language),
          field("SMS ID", scanned.passport_id),
        ]),
      ]),
    );
  }
  return nodes;
}

function brandMark(): HTMLElement {
  const mark = h("span", { class: "mark", "aria-hidden": "true" });
  mark.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 20V4m-8 8h16M7.5 6.5h9M7.5 17.5h9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  return mark;
}

export function render(screen: Screen, handlers: Handlers): HTMLElement {
  const page = h("div", {});
  const top = h("header", { class: "top" }, [
    h("div", { class: "brand" }, [
      brandMark(),
      h("div", {}, [
        h("p", { class: "brand-name" }, ["Pumzi Care"]),
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
