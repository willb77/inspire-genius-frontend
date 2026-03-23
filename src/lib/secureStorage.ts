// Minimal encrypted localStorage helpers using Web Crypto (AES-GCM)
// Requires VITE_STORAGE_SECRET to derive a key. Falls back to plain JSON if Web Crypto fails.

const TEXT = new TextEncoder();
const RTEXT = new TextDecoder();

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
}
function safeRemove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* storage blocked */ }
}

async function getKey(): Promise<CryptoKey | null> {
  try {
    const secret = (import.meta.env.VITE_STORAGE_SECRET as string) || "";
    if (!secret) return null;
    const saltBytes = TEXT.encode("inspiregenius.storage.salt.v1");
    const baseKey = await crypto.subtle.importKey("raw", TEXT.encode(secret), "PBKDF2", false, ["deriveKey"]);
    return await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", iterations: 100_000, salt: saltBytes },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  } catch {
    return null;
  }
}

export async function secureSetItem(key: string, value: unknown): Promise<void> {
  try {
    const k = await getKey();
    const json = JSON.stringify(value);
    if (!k || !crypto?.subtle) {
      safeSet(key, json);
      return;
    }
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, TEXT.encode(json));
    const payload = {
      iv: Array.from(iv),
      data: btoa(String.fromCharCode(...new Uint8Array(cipher))),
      v: 1,
    };
    safeSet(key, JSON.stringify(payload));
  } catch {
    safeSet(key, JSON.stringify(value));
  }
}

export async function secureGetItem<T = unknown>(key: string): Promise<T | null> {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    const k = await getKey();
    if (!k || !crypto?.subtle) return JSON.parse(raw) as T;
    const parsed = JSON.parse(raw) as { iv?: number[]; data?: string; v?: number };
    if (!parsed?.iv || !parsed?.data) return JSON.parse(raw) as T;
    const iv = new Uint8Array(parsed.iv);
    const bytes = Uint8Array.from(atob(parsed.data), (c) => c.charCodeAt(0));
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, k, bytes);
    return JSON.parse(RTEXT.decode(plain)) as T;
  } catch {
    try { return JSON.parse(raw) as T; } catch { return null; }
  }
}

export async function secureRemoveItem(key: string): Promise<void> {
  safeRemove(key);
}
