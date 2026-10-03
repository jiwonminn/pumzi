import { b64ToBytes, bytesToB64, decryptString, deriveKey, encryptString, makeVerifier, verifierMatches } from "./crypto";
import type { StoredEncounter } from "./types";

interface PinMeta {
  salt: string;
  verifier_iv: string;
  verifier: string;
}

interface Envelope {
  iv: string;
  ciphertext: string;
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("pumzi", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta");
      if (!db.objectStoreNames.contains("encounters")) db.createObjectStore("encounters");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function meta(): Promise<PinMeta | null> {
  const db = await openDb();
  const row = await request(db.transaction("meta").objectStore("meta").get("pin"));
  db.close();
  return (row as PinMeta | undefined) ?? null;
}

export async function pinExists(): Promise<boolean> {
  return (await meta()) !== null;
}

export async function createPin(pin: string): Promise<CryptoKey> {
  if (await pinExists()) throw new Error("PIN_EXISTS");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pin, salt);
  const verifier = await makeVerifier(key);
  const db = await openDb();
  const tx = db.transaction("meta", "readwrite");
  tx.objectStore("meta").put(
    { salt: bytesToB64(salt), verifier_iv: verifier.iv, verifier: verifier.ciphertext } satisfies PinMeta,
    "pin",
  );
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return key;
}

export async function unlock(pin: string): Promise<CryptoKey | null> {
  const row = await meta();
  if (!row) throw new Error("NO_PIN");
  const key = await deriveKey(pin, b64ToBytes(row.salt));
  const ok = await verifierMatches(key, row.verifier_iv, row.verifier);
  return ok ? key : null;
}

async function putEnvelope(id: string, key: CryptoKey, record: StoredEncounter): Promise<void> {
  const sealed = await encryptString(key, JSON.stringify(record));
  const envelope: Envelope = {
    iv: bytesToB64(sealed.iv),
    ciphertext: bytesToB64(sealed.ciphertext),
  };
  const db = await openDb();
  const tx = db.transaction("encounters", "readwrite");
  tx.objectStore("encounters").put(envelope, id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function saveEncounter(key: CryptoKey, record: StoredEncounter): Promise<void> {
  await putEnvelope(record.passport.passport_id, key, record);
}

export async function listEncounters(key: CryptoKey): Promise<StoredEncounter[]> {
  const db = await openDb();
  const rows = await request(db.transaction("encounters").objectStore("encounters").getAll());
  db.close();
  const out: StoredEncounter[] = [];
  for (const row of rows) {
    const envelope = row as Envelope;
    try {
      const plain = await decryptString(key, b64ToBytes(envelope.iv), b64ToBytes(envelope.ciphertext));
      const record = JSON.parse(plain) as StoredEncounter;
      if (record?.passport?.passport_id) out.push(record);
    } catch {
      /* skip a record this PIN cannot read */
    }
  }
  out.sort((a, b) => b.passport.timestamp.localeCompare(a.passport.timestamp));
  return out;
}

export async function hasEncounter(passportId: string): Promise<boolean> {
  const db = await openDb();
  const row = await request(db.transaction("encounters").objectStore("encounters").get(passportId));
  db.close();
  return row !== undefined;
}

export async function updateEncounter(
  key: CryptoKey,
  passportId: string,
  change: (record: StoredEncounter) => void,
): Promise<void> {
  const all = await listEncounters(key);
  const record = all.find((item) => item.passport.passport_id === passportId);
  if (!record) return;
  change(record);
  await putEnvelope(passportId, key, record);
}
