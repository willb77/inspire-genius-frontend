type ChatAudioRecord = {
  conversationId: string;
  textPreview: string;
  createdAt: number;
  mimeType: string;
  // legacy/plain storage
  blob?: Blob;
  // encrypted storage
  iv?: number[];
  cipher?: ArrayBuffer;
  v?: number;
};

const DB_NAME = "chat-audio";
const DB_VERSION = 8;
const STORE = "audio";

const TEXT = new TextEncoder();

let keyPromise: Promise<CryptoKey | null> | null = null;

async function getKey(): Promise<CryptoKey | null> {
  if (keyPromise) return keyPromise;
  keyPromise = (async () => {
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
  })();
  return keyPromise;
}

async function encryptBytes(plain: ArrayBuffer): Promise<{ iv?: number[]; cipher: ArrayBuffer; v: number }> {
  const k = await getKey();
  if (!k || !crypto?.subtle) {
    return { cipher: plain, v: 0 };
  }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, k, plain);
  return { iv: Array.from(iv), cipher, v: 1 };
}

async function decryptBytes(payload: { iv?: number[]; cipher: ArrayBuffer; v?: number }): Promise<ArrayBuffer> {
  const k = await getKey();
  if (!k || !crypto?.subtle) {
    return payload.cipher;
  }
  if (!payload.iv || payload.iv.length === 0) {
    return payload.cipher;
  }
  const iv = new Uint8Array(payload.iv);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, k, payload.cipher);
  return plain;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE)) {
        db.deleteObjectStore(STORE);
      }

      const store = db.createObjectStore(STORE, {
        keyPath: ["conversationId", "textPreview"],
      });

      if (!store.indexNames.contains("byConversationId")) {
        store.createIndex("byConversationId", "conversationId", { unique: false });
      }

      if (!store.indexNames.contains("byCreatedAt")) {
        store.createIndex("byCreatedAt", "createdAt", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const dataLength = audioBuffer.length * numberOfChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  let offset = 0;
  const writeUint16 = (v: number) => {
    view.setUint16(offset, v, true);
    offset += 2;
  };
  const writeUint32 = (v: number) => {
    view.setUint32(offset, v, true);
    offset += 4;
  };

  // RIFF header
  writeUint32(0x46464952); // "RIFF"
  writeUint32(36 + dataLength);
  writeUint32(0x45564157); // "WAVE"

  // fmt chunk
  writeUint32(0x20746d66); // "fmt "
  writeUint32(16);
  writeUint16(1); // PCM
  writeUint16(numberOfChannels);
  writeUint32(sampleRate);
  writeUint32(sampleRate * numberOfChannels * bytesPerSample);
  writeUint16(numberOfChannels * bytesPerSample);
  writeUint16(bitDepth);

  // data chunk
  writeUint32(0x61746164); // "data"
  writeUint32(dataLength);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numberOfChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  let index = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      let sample = channels[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(index, intSample, true);
      index += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export async function audioBufferToWavArrayBuffer(audioBuffer: AudioBuffer): Promise<ArrayBuffer> {
  return await audioBufferToWavBlob(audioBuffer).arrayBuffer();
}

export function makeAudioTextPreview(text: string, maxChars: number = 200): string {
  const raw = (text ?? "").trim();
  if (!raw) return "";
  return raw.slice(0, Math.max(0, Math.floor(maxChars)));
}

export async function putConversationAudio(conversationId: string, textPreview: string, blob: Blob): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  const record: ChatAudioRecord = {
    conversationId,
    textPreview,
    createdAt: Date.now(),
    mimeType: blob.type || "audio/wav",
    blob,
  };

  store.put(record);
  await txDone(tx);
  db.close();
}

export async function putConversationAudioEncrypted(
  conversationId: string,
  textPreview: string,
  wav: ArrayBuffer,
  mimeType: string = "audio/wav"
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  const enc = await encryptBytes(wav);
  const record: ChatAudioRecord = {
    conversationId,
    textPreview,
    createdAt: Date.now(),
    mimeType,
    iv: enc.iv,
    cipher: enc.cipher,
    v: enc.v,
  };

  store.put(record);
  await txDone(tx);
  db.close();
}

export async function getConversationAudio(conversationId: string, textPreview: string): Promise<ChatAudioRecord | null> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const req = store.get([conversationId, textPreview]);
  const result = await requestToPromise(req);
  await txDone(tx);
  db.close();
  return (result as ChatAudioRecord | undefined) ?? null;
}

export async function getConversationAudioDecrypted(conversationId: string, textPreview: string): Promise<{ mimeType: string; wav: ArrayBuffer } | null> {
  const rec = await getConversationAudio(conversationId, textPreview);
  if (!rec) return null;

  if (rec.cipher) {
    try {
      const wav = await decryptBytes({ iv: rec.iv, cipher: rec.cipher, v: rec.v });
      return { mimeType: rec.mimeType || "audio/wav", wav };
    } catch {
      return null;
    }
  }

  if (rec.blob) {
    try {
      const wav = await rec.blob.arrayBuffer();
      return { mimeType: rec.mimeType || rec.blob.type || "audio/wav", wav };
    } catch {
      return null;
    }
  }

  return null;
}

export async function listConversationAudioTextPreviews(conversationId: string): Promise<string[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const idx = store.index("byConversationId");
  const range = IDBKeyRange.only(conversationId);
  const out: string[] = [];

  await new Promise<void>((resolve, reject) => {
    const cursorReq = idx.openCursor(range);
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) {
        resolve();
        return;
      }
      const v = cursor.value as { textPreview?: string };
      if (typeof v.textPreview === "string") out.push(v.textPreview);
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });

  await txDone(tx);
  db.close();
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

export async function clearAllConversationAudio(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).clear();
  await txDone(tx);
  db.close();
}

export async function clearConversationAudio(conversationId: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const index = store.index("byConversationId");

  const range = IDBKeyRange.only(conversationId);
  await new Promise<void>((resolve, reject) => {
    const cursorReq = index.openCursor(range);
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });

  await txDone(tx);
  db.close();
}

export async function hasConversationAudio(conversationId: string, textPreview: string): Promise<boolean> {
  const rec = await getConversationAudio(conversationId, textPreview);
  return Boolean(rec);
}

export type PruneChatAudioDbOptions = {
  enabled?: boolean;
  maxItems?: number;
  maxAgeSeconds?: number;
};

export const CHAT_AUDIO_DB_PRUNE_CONFIG: PruneChatAudioDbOptions = {
  enabled: true,
  maxItems: 50,
};

export async function pruneChatAudioDb(options: PruneChatAudioDbOptions = {}): Promise<void> {
  const { enabled = false, maxItems = 10, maxAgeSeconds } = options;
  if (!enabled) return;

  const safeMax = Number.isFinite(maxItems) ? Math.max(0, Math.floor(maxItems)) : 50;
  const cutoff =
    typeof maxAgeSeconds === "number" && Number.isFinite(maxAgeSeconds) && maxAgeSeconds > 0
      ? Date.now() - Math.floor(maxAgeSeconds * 1000)
      : null;

  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  const byCreatedAt = store.indexNames.contains("byCreatedAt") ? store.index("byCreatedAt") : null;

  // 1) TTL delete (optional)
  if (byCreatedAt && cutoff !== null) {
    await new Promise<void>((resolve, reject) => {
      const range = IDBKeyRange.upperBound(cutoff, true);
      const cursorReq = byCreatedAt.openCursor(range);
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          resolve();
          return;
        }
        cursor.delete();
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  }

  // 2) Count after TTL delete, then cap to max items
  if (safeMax > 0 && byCreatedAt) {
    const total = await requestToPromise(store.count());
    let toDelete = total - safeMax;
    if (toDelete > 0) {
      await new Promise<void>((resolve, reject) => {
        const cursorReq = byCreatedAt.openCursor();
        cursorReq.onsuccess = () => {
          const cursor = cursorReq.result;
          if (!cursor || toDelete <= 0) {
            resolve();
            return;
          }
          cursor.delete();
          toDelete -= 1;
          cursor.continue();
        };
        cursorReq.onerror = () => reject(cursorReq.error);
      });
    }
  }

  await txDone(tx);
  db.close();
}
