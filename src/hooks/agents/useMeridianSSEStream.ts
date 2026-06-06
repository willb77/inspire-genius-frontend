/**
 * T22 — React hook around `streamMeridianChat` for the Meridian chat UI.
 *
 * Provides a mutate-style API: caller invokes `send({ message, sessionId })`,
 * the hook accumulates tokens into `streamingText` while the stream is in
 * flight, then sets `lastComplete` (with the final content + metadata) when
 * the `event: complete` frame arrives.
 *
 * Gracefully falls back: when the backend returns 404 STREAMING_DISABLED
 * (its flag is OFF), `lastError` is populated and `onFallback` (if supplied)
 * is invoked so the caller can switch to the non-streaming REST hook.
 */
import { useCallback, useRef, useState } from "react"

import {
  streamMeridianChat,
  StreamingDisabledError,
  PreflightAsyncRedirectError,
  type PreflightAsyncRedirect,
  type StreamChatRequest,
  type StreamCompleteFrame,
  type StreamErrorFrame,
} from "@/services/agent/meridianChatStream"

export type UseMeridianSSEStreamOptions = {
  /** Called once when the server returns 404 STREAMING_DISABLED. */
  onFallback?: () => void
  /**
   * T22 option C — called once when the server's preflight check
   * redirects to async-jobs. The caller should switch to polling
   * `GET /v1/agents/chat/jobs/{redirect.jobId}` for the final result.
   */
  onAsyncRedirect?: (redirect: PreflightAsyncRedirect) => void
  /** Called for each token after it's appended to streamingText. */
  onToken?: (token: string) => void
  /** Called once when the stream completes. */
  onComplete?: (frame: StreamCompleteFrame) => void
  /** Called once when the stream errors (server-emitted error frame). */
  onError?: (frame: StreamErrorFrame) => void
}

export type UseMeridianSSEStreamResult = {
  /** Tokens accumulated so far for the in-flight stream. Resets per send(). */
  streamingText: string
  /** True while a stream is in flight. */
  isStreaming: boolean
  /** Last completed frame, or null if no stream has completed. */
  lastComplete: StreamCompleteFrame | null
  /** Last error encountered (server-emitted or transport). Null if none. */
  lastError: Error | null
  /** Last preflight async-redirect, or null if none. T22 option C. */
  lastAsyncRedirect: PreflightAsyncRedirect | null
  /** Kick off a stream. Cancels any in-flight stream first. */
  send: (request: StreamChatRequest) => Promise<void>
  /** Cancel the in-flight stream. */
  cancel: () => void
}

export function useMeridianSSEStream(
  options: UseMeridianSSEStreamOptions = {},
): UseMeridianSSEStreamResult {
  const [streamingText, setStreamingText] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastComplete, setLastComplete] = useState<StreamCompleteFrame | null>(null)
  const [lastError, setLastError] = useState<Error | null>(null)
  const [lastAsyncRedirect, setLastAsyncRedirect] = useState<PreflightAsyncRedirect | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsStreaming(false)
  }, [])

  const send = useCallback(
    async (request: StreamChatRequest) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setStreamingText("")
      setLastError(null)
      setIsStreaming(true)

      try {
        await streamMeridianChat(request, {
          signal: controller.signal,
          onToken: (frame) => {
            setStreamingText((prev) => prev + frame.content)
            options.onToken?.(frame.content)
          },
          onComplete: (frame) => {
            setLastComplete(frame)
            options.onComplete?.(frame)
          },
          onError: (frame) => {
            const err = new Error(frame.message)
            setLastError(err)
            options.onError?.(frame)
          },
        })
      } catch (err) {
        if (err instanceof StreamingDisabledError) {
          options.onFallback?.()
          setLastError(err)
        } else if (err instanceof PreflightAsyncRedirectError) {
          setLastAsyncRedirect(err.redirect)
          options.onAsyncRedirect?.(err.redirect)
        } else if ((err as Error).name === "AbortError") {
          // User-initiated cancel — not an error to surface.
        } else {
          setLastError(err as Error)
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
        setIsStreaming(false)
      }
    },
    [options],
  )

  return {
    streamingText,
    isStreaming,
    lastComplete,
    lastError,
    lastAsyncRedirect,
    send,
    cancel,
  }
}
