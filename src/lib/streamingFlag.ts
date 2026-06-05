/**
 * T22 feature flag — SSE token streaming for Meridian chat.
 *
 * When ON, the chat surface uses the streaming endpoint at
 * POST /v1/agents/chat/stream (text/event-stream) via
 * useMeridianSSEStream. When OFF (the default), it falls back to the
 * non-streaming REST path via useAgentConversation.
 *
 * Storage key: `stream_text_responses_enabled` in localStorage.
 *   `"true"`  → streaming ON
 *   anything else (or unset) → streaming OFF (default)
 *
 * The flag mirrors the backend's `AGENT_ENGINE_STREAM_TEXT_RESPONSES`
 * env var. Both must be ON for streaming to actually fire — the
 * backend returns 404 STREAMING_DISABLED when its flag is OFF, and
 * the client must fall back gracefully.
 */
const STREAM_FLAG_KEY = "stream_text_responses_enabled"

export function isStreamTextResponsesEnabled(): boolean {
  try {
    return localStorage.getItem(STREAM_FLAG_KEY) === "true"
  } catch {
    return false
  }
}

export function setStreamTextResponsesEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(STREAM_FLAG_KEY, "true")
    } else {
      localStorage.removeItem(STREAM_FLAG_KEY)
    }
  } catch {
    /* localStorage unavailable (SSR, blocked) — flag stays default */
  }
}

export { STREAM_FLAG_KEY }
