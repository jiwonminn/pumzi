const VERIFIER = "pumzi-ok";
const ITERATIONS = 100_000;

function asBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: asBuffer(salt), iterations: ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptString(
  key: CryptoKey,
  plain: string,
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBuffer(iv) },
    key,
    new TextEncoder().encode(plain),
  );
  return { iv, ciphertext: new Uint8Array(cipher) };
}

export async function decryptString(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Promise<string> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBuffer(iv) },
    key,
    asBuffer(ciphertext),
  );
  return new TextDecoder().decode(plain);
}

export function bytesToB64(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

export function b64ToBytes(value: string): Uint8Array {
  const text = atob(value);
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i);
  return out;
}

export async function makeVerifier(
  key: CryptoKey,
): Promise<{ iv: string; ciphertext: string }> {
  const sealed = await encryptString(key, VERIFIER);
  return { iv: bytesToB64(sealed.iv), ciphertext: bytesToB64(sealed.ciphertext) };
}

export async function verifierMatches(
  key: CryptoKey,
  iv: string,
  ciphertext: string,
): Promise<boolean> {
  try {
    const plain = await decryptString(key, b64ToBytes(iv), b64ToBytes(ciphertext));
    return plain === VERIFIER;
  } catch {
    return false;
  }
}

export function pinIsValid(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}
