/**
 * T22 — Server-Sent Events client for POST /v1/agents/chat/stream.
 *
 * The browser's `EventSource` only supports GET, so we use `fetch()` with
 * a body and parse the `text/event-stream` payload off `body.getReader()`.
 *
 * Frame format (matches the backend in
 * services/agent-engine/app/main.py::chat_stream):
 *
 *   event: token
 *   data: {"content": "...", "agent": "..."}
 *
 *   event: complete
 *   data: {"content": "...full...", "agent": "...", "session_id": "...",
 *          "metadata": {"assistant_message_id": "...", ...}}
 *
 *   event: error
 *   data: {"message": "..."}
 *
 * Falls back to the non-streaming REST path when:
 *   - the flag is OFF on the client (caller checks `isStreamTextResponsesEnabled`
 *     before invoking this), OR
 *   - the server returns 404 STREAMING_DISABLED (the backend flag is OFF), OR
 *   - any other non-2xx — the caller decides whether to retry via REST.
 */
import { agentApi } from "@/lib/agentApi"

export type StreamTokenFrame = {
  type: "token"
  content: string
  agent: string
}

export type StreamCompleteFrame = {
  type: "complete"
  content: string
  agent: string
  sessionId: string
  metadata: Record<string, unknown>
}

export type StreamErrorFrame = {
  type: "error"
  message: string
}

export type StreamFrame = StreamTokenFrame | StreamCompleteFrame | StreamErrorFrame

export type StreamChatRequest = {
  message: string
  sessionId?: string
  context?: Record<string, unknown>
  fileIds?: string[]
}

export type StreamChatCallbacks = {
  onToken?: (frame: StreamTokenFrame) => void
  onComplete?: (frame: StreamCompleteFrame) => void
  onError?: (frame: StreamErrorFrame) => void
  signal?: AbortSignal
}

export class StreamingDisabledError extends Error {
  constructor() {
    super("Server-side streaming flag is disabled (404 STREAMING_DISABLED)")
    this.name = "StreamingDisabledError"
  }
}

/**
 * T22 option C — the server peeked at the routing decision and decided
 * the upcoming response is a multi-agent DAG. The job is already
 * enqueued; the caller should switch to polling
 * `GET /v1/agents/chat/jobs/{job_id}` for the final result.
 */
export type PreflightAsyncRedirect = {
  mode: "async"
  jobId: string
  status: string
  sessionId: string
  reason: string
}

export class PreflightAsyncRedirectError extends Error {
  redirect: PreflightAsyncRedirect

  constructor(redirect: PreflightAsyncRedirect) {
    super(`Preflight redirected to async job ${redirect.jobId} (reason: ${redirect.reason})`)
    this.name = "PreflightAsyncRedirectError"
    this.redirect = redirect
  }
}

/**
 * Stream tokens from POST /v1/agents/chat/stream and invoke the matching
 * callback per frame. Resolves when the stream completes (or errors); the
 * caller can abort mid-stream via `signal`.
 */
export async function streamMeridianChat(
  request: StreamChatRequest,
  callbacks: StreamChatCallbacks = {},
): Promise<void> {
  const baseURL = agentApi.defaults.baseURL ?? ""
  const url = `${baseURL.replace(/\/$/, "")}/v1/agents/chat/stream`

  const accessToken =
    (agentApi.defaults.headers.common["access-token"] as string | undefined) ?? ""

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(accessToken ? { "access-token": accessToken } : {}),
    },
    body: JSON.stringify({
      message: request.message,
      session_id: request.sessionId,
      context: request.context,
      file_ids: request.fileIds,
    }),
    signal: callbacks.signal,
  })

  if (resp.status === 404) {
    throw new StreamingDisabledError()
  }
  if (!resp.ok) {
    throw new Error(`SSE request failed: HTTP ${resp.status}`)
  }

  // T22 option C — when the server peeks at routing and decides the
  // upcoming response is a multi-agent DAG, it returns
  // application/json {mode: "async", job_id, ...} instead of an SSE
  // stream. Throw a typed redirect so the caller can switch to
  // polling /v1/agents/chat/jobs/{job_id} without trying to parse SSE.
  const contentType = resp.headers.get("content-type") ?? ""
  if (contentType.startsWith("application/json")) {
    const body = (await resp.json()) as {
      mode?: string
      job_id?: string
      status?: string
      session_id?: string
      reason?: string
    }
    if (body.mode === "async" && body.job_id) {
      throw new PreflightAsyncRedirectError({
        mode: "async",
        jobId: body.job_id,
        status: body.status ?? "queued",
        sessionId: body.session_id ?? "",
        reason: body.reason ?? "preflight",
      })
    }
    throw new Error(`SSE request returned unexpected JSON: ${JSON.stringify(body)}`)
  }

  if (!resp.body) {
    throw new Error("SSE request returned empty body")
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder("utf-8")
  let buffer = ""

  // Parse SSE format: events separated by blank lines (\n\n).
  // Each event has "event: <name>" and "data: <json>" lines.
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sepIdx: number
    while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sepIdx)
      buffer = buffer.slice(sepIdx + 2)
      const frame = parseFrame(block)
      if (!frame) continue
      dispatchFrame(frame, callbacks)
    }
  }

  // Flush trailing partial buffer (some servers don't terminate with \n\n).
  if (buffer.trim()) {
    const frame = parseFrame(buffer)
    if (frame) dispatchFrame(frame, callbacks)
  }
}

function parseFrame(block: string): StreamFrame | null {
  let eventName: string | null = null
  let dataLine: string | null = null
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trimEnd()
    if (line.startsWith("event: ")) {
      eventName = line.slice("event: ".length).trim()
    } else if (line.startsWith("data: ")) {
      dataLine = line.slice("data: ".length)
    }
  }
  if (!eventName || dataLine === null) return null

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(dataLine)
  } catch {
    return null
  }

  switch (eventName) {
    case "token":
      return {
        type: "token",
        content: String(payload.content ?? ""),
        agent: String(payload.agent ?? "Meridian"),
      }
    case "complete":
      return {
        type: "complete",
        content: String(payload.content ?? ""),
        agent: String(payload.agent ?? "Meridian"),
        sessionId: String(payload.session_id ?? ""),
        metadata: (payload.metadata as Record<string, unknown>) ?? {},
      }
    case "error":
      return {
        type: "error",
        message: String(payload.message ?? "Unknown streaming error"),
      }
    default:
      return null
  }
}

function dispatchFrame(frame: StreamFrame, callbacks: StreamChatCallbacks): void {
  switch (frame.type) {
    case "token":
      callbacks.onToken?.(frame)
      break
    case "complete":
      callbacks.onComplete?.(frame)
      break
    case "error":
      callbacks.onError?.(frame)
      break
  }
}
