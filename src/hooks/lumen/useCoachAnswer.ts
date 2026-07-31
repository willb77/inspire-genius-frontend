import { useCallback, useMemo, useRef, useState } from "react"
import { useMeridianJob, type ChatJob } from "@/hooks/agents/useMeridianJob"

/**
 * Ask the coach a question and get the answer **on the Lumen page** instead of
 * being thrown into a chat window.
 *
 * Routes through the ordinary Meridian async-job path
 * (`POST /v1/agents/chat/async` → poll `GET /v1/agents/chat/jobs/{id}`), which
 * matters for three reasons:
 *
 *  1. **Meridian is not bypassed.** She still classifies the question and routes
 *     it to whichever specialist it needs, so an inline answer is the same
 *     answer the chat surface would give — not a second, thinner coach.
 *  2. **No new backend route.** Job Fit could answer inline because it already
 *     had `explain-fit`; Lumen has no equivalent, and a synchronous LLM route
 *     would sit behind API Gateway's hard 30s cap and 503 on anything
 *     substantial. The async path is the one designed for this.
 *  3. **The poll is the real delivery mechanism.** The `job_complete` WebSocket
 *     push is not reachable through the production ws-proxy, so this hook
 *     deliberately never opens a socket and relies on `useMeridianJob`'s poll.
 *
 * One session id is minted per page mount and reused for every question, so the
 * coach keeps context across a run of questions the way a conversation would.
 */

export type CoachAnswer = {
  id: string
  /** The question as the person would recognise it — no scope preamble. */
  question: string
  /** What was actually sent, scope line included. Kept for the export footer. */
  prompt: string
  answer: string
  /** Specialists behind the synthesized reply, when the server reports them. */
  agents?: string[]
  askedAt: Date
}

export type UseCoachAnswerReturn = {
  answers: CoachAnswer[]
  /** The question currently in flight, for the pending bubble. */
  pendingQuestion: string | null
  isPending: boolean
  /** True when the last attempt failed; cleared on the next ask. */
  isError: boolean
  ask: (input: { question: string; prompt: string }) => Promise<void>
  clear: () => void
}

function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === "function") return c.randomUUID()
  // jsdom in older Node, and any browser without the secure-context API.
  return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`
}

export function useCoachAnswer(): UseCoachAnswerReturn {
  const [answers, setAnswers] = useState<CoachAnswer[]>([])
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  // Stable for the life of the page: successive questions are one conversation.
  const sessionIdRef = useRef<string>("")
  if (!sessionIdRef.current) sessionIdRef.current = `lumen-coaching-${newId()}`

  // The question text can't be recovered from the settled job (push frames drop
  // `message`), so it's parked here between ask and settle.
  const inFlightRef = useRef<{ question: string; prompt: string } | null>(null)

  const onJobSettled = useCallback((job: ChatJob) => {
    const asked = inFlightRef.current
    inFlightRef.current = null
    setPendingQuestion(null)

    const body = (job.content ?? "").trim()
    if (job.status === "error" || !body) {
      setIsError(true)
      return
    }
    setAnswers((prev) => [
      ...prev,
      {
        id: job.job_id,
        question: asked?.question ?? job.message ?? "",
        prompt: asked?.prompt ?? job.message ?? "",
        answer: body,
        agents: job.metadata?.contributing_agents,
        askedAt: new Date(),
      },
    ])
  }, [])

  const { startJob } = useMeridianJob({ onJobSettled })

  const ask = useCallback(
    async ({ question, prompt }: { question: string; prompt: string }) => {
      const message = prompt.trim()
      if (!message || inFlightRef.current) return
      setIsError(false)
      inFlightRef.current = { question: question.trim() || message, prompt: message }
      setPendingQuestion(inFlightRef.current.question)
      try {
        await startJob({
          message,
          sessionId: sessionIdRef.current,
          context: { session_id: sessionIdRef.current, surface: "lumen-coaching" },
        })
      } catch {
        // Never accepted — no job exists, so `onJobSettled` will never fire and
        // the pending bubble would otherwise spin forever.
        inFlightRef.current = null
        setPendingQuestion(null)
        setIsError(true)
      }
    },
    [startJob]
  )

  const clear = useCallback(() => {
    setAnswers([])
    setIsError(false)
  }, [])

  return useMemo(
    () => ({
      answers,
      pendingQuestion,
      isPending: pendingQuestion !== null,
      isError,
      ask,
      clear,
    }),
    [answers, pendingQuestion, isError, ask, clear]
  )
}
