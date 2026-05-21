// Persistent per-thread conversation session_id for Meridian/Alex chat.
//
// Fixes the "alex-chat" mega-session bug (Issue #197): the literal string
// "alex-chat" was reused as session_id for every chat turn from a given
// user, causing conversation_messages to accumulate forever under one
// session_id and breaking memory recall.
//
// One UUID is persisted via secureStorage. The user (or a programmatic
// boundary) can rotate it via newConversation() to start a fresh thread.

import { secureGetItem, secureSetItem } from "@/lib/secureStorage";

const STORAGE_KEY = "ig_conversation_session_id";

function generateUuid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // ignore — fall through
  }
  // RFC4122 v4 fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let _cached: string | null = null;

export async function getCurrentConversationId(): Promise<string> {
  if (_cached) return _cached;
  const stored = await secureGetItem<string>(STORAGE_KEY);
  if (typeof stored === "string" && stored.length > 0) {
    _cached = stored;
    return stored;
  }
  const fresh = generateUuid();
  await secureSetItem(STORAGE_KEY, fresh);
  _cached = fresh;
  return fresh;
}

export async function newConversation(): Promise<string> {
  const fresh = generateUuid();
  await secureSetItem(STORAGE_KEY, fresh);
  _cached = fresh;
  return fresh;
}

// Test-only helper to reset the in-memory cache.
export function __resetConversationSessionCacheForTests(): void {
  _cached = null;
}
