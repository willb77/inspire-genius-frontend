/**
 * The chat transport every Meridian surface uses.
 *
 * **Send over `POST /v1/agents/chat/async` (`useMeridianJob`), never over the
 * WebSocket.** The socket is a push accelerator here and nothing more: the job
 * poll settles the turn on its own, so a socket that is closed, unauthenticated
 * or wired to a Lambda that does not exist costs latency instead of the answer.
 *
 * That is not hypothetical. On 2026-09-02 one tier's ws-proxy was found
 * dispatching to a forwarder Lambda hardcoded to a DIFFERENT environment's
 * name — a function that does not exist in that account — so every
 * browser→server WebSocket chat frame on the tier failed with AccessDenied:
 * 188 connects, 188 disconnects, zero messages delivered in 24h.
 * `MeridianChat` was unaffected because it already sent over the async-jobs
 * path; the two panels that sent over the socket (Team Development Studio and
 * Bio Capture) accepted the question, saved it, and never replied. See
 * `.claude/rules/agents.md` §6.
 *
 * Errors are part of this hook's contract, not an optional extra. The reason
 * the outage above went unnoticed is that both panels destructured
 * `useMeridianWebSocket` WITHOUT `error`, so the one frame the proxy did send
 * back — `{"type":"error"}` — was parsed, stored in hook state, and rendered
 * nowhere. A surface that cannot say "that failed" is indistinguishable from a
 * surface that is merely slow.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useMeridianJob, type ChatJob } from "@/hooks/agents/useMeridianJob"
import {
  useMeridianWebSocket,
  type MeridianResponse,
} from "@/hooks/agents/useMeridianWebSocket"

export type MeridianChatOptions = {
  /**
   * Stable key for the conversation — a member id, a session id, whatever the
   * surface considers "one thread". A new key mints a new server session id;
   * the same key reuses it for the life of the component.
   */
  sessionKey: string
  /** Access token used to open the push socket. No token ⇒ poll-only, still works. */
  accessToken?: string
  /**
   * Context forwarded verbatim as the job's `context`, which the agent-engine
   * binds to `working_memory`. `surface` is read there by
   * `app/profile/surface_grounding.py` — get it wrong and the reply is
   * grounded in the wrong person.
   */
  context?: Record<string, unknown>
  /** Called once per settled assistant turn. */
  onAssistant?: (content: string, job: ChatJob) => void
  /** Called when a turn fails, in addition to `error` being set. */
  onError?: (message: string) => void
}

export type MeridianChatReturn = {
  /** Send a message. Resolves once the job is accepted, not once it answers. */
  send: (text: string, contextOverride?: Record<string, unknown>) => Promise<void>
  /** True from send until the turn settles or fails. */
  isProcessing: boolean
  /** Partial content from `job_progress` push frames, when the server sends any. */
  partial: string
  /** Human-readable failure for the surface to render. Null when healthy. */
  error: string | null
  /** Dismiss the current error (e.g. when the user retries). */
  clearError: () => void
  /** Push-socket state. Informational only — sending does not depend on it. */
  isPushConnected: boolean
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `s-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useMeridianChat(options: MeridianChatOptions): MeridianChatReturn {
  const { sessionKey, accessToken, context, onAssistant, onError } = options

  const [isProcessing, setIsProcessing] = useState(false)
  const [partial, setPartial] = useState("")
  const [error, setError] = useState<string | null>(null)

  const onAssistantRef = useRef(onAssistant)
  onAssistantRef.current = onAssistant
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const contextRef = useRef(context)
  contextRef.current = context

  // One server session per sessionKey, stable across re-renders.
  const sessionIdsRef = useRef<Record<string, string>>({})
  const sessionId = useMemo(() => {
    if (!sessionIdsRef.current[sessionKey]) {
      sessionIdsRef.current[sessionKey] = newSessionId()
    }
    return sessionIdsRef.current[sessionKey]
  }, [sessionKey])

  const fail = useCallback((message: string) => {
    setIsProcessing(false)
    setPartial("")
    setError(message)
    onErrorRef.current?.(message)
  }, [])

  const { startJob, notifyPushFrame } = useMeridianJob({
    onJobUpdate: (job) => {
      // Progress frames may carry partial content; render it while we wait.
      if (job.status === "running" && job.content) setPartial(job.content)
    },
    onJobSettled: (job) => {
      setPartial("")
      setIsProcessing(false)
      if (job.status === "error") {
        fail(job.error || "Meridian couldn't answer that. Try again.")
        return
      }
      const content = (job.content ?? "").trim()
      if (!content) {
        // A "complete" job with nothing in it is a failure wearing a success
        // label. Say so rather than rendering an empty bubble.
        fail("Meridian returned an empty response. Try again.")
        return
      }
      onAssistantRef.current?.(content, job)
    },
  })

  // The socket exists only to short-circuit the poll. Every `job_*` frame goes
  // to the job hook; nothing is ever sent on this socket.
  const onResponse = useCallback(
    (res: MeridianResponse) => {
      if (notifyPushFrame(res)) return
      if (res.type === "error") fail(res.message || "Meridian couldn't answer that.")
    },
    [notifyPushFrame, fail],
  )

  const { isConnected, connect, disconnect } = useMeridianWebSocket({ onResponse })

  useEffect(() => {
    if (!accessToken) return
    const timer = setTimeout(() => connect(accessToken), 300)
    return () => {
      clearTimeout(timer)
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  const send = useCallback(
    async (text: string, contextOverride?: Record<string, unknown>) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setError(null)
      setPartial("")
      setIsProcessing(true)
      try {
        await startJob({
          message: trimmed,
          sessionId,
          context: { ...(contextRef.current ?? {}), ...(contextOverride ?? {}) },
        })
      } catch {
        fail("Couldn't reach Meridian. Check your connection and try again.")
      }
    },
    [startJob, sessionId, fail],
  )

  const clearError = useCallback(() => setError(null), [])

  return useMemo(
    () => ({ send, isProcessing, partial, error, clearError, isPushConnected: isConnected }),
    [send, isProcessing, partial, error, clearError, isConnected],
  )
}
