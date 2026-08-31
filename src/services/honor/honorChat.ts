/**
 * Honor Evaluate transport — Meridian async-jobs flow.
 *
 * Cloned from src/services/summit/summitChat.ts (the Summit pattern). The
 * coach's evaluation prompt about a SELECTED member is routed to the existing
 * agents (Aura/James/Nova/Ascend/Echo/Bridge/Grant) synthesized by Meridian —
 * NOT a bespoke DAG. Uses the async-jobs flow to beat the 30s API-Gateway cap on
 * the synchronous POST /v1/agents/chat:
 *   1. POST /v1/agents/chat/async  → returns a job_id immediately.
 *   2. Poll GET /v1/agents/chat/jobs/{job_id} until a terminal state.
 * The member-scoped context (context.surface="honor" + member_id) tells the
 * server this is a coach evaluating a member.
 */
import { getApi } from "@/lib/agentApi"

export type HonorEvalReply = {
  content: string
  /** Ordered agent trace (contributing_agents) for the auditability panel. */
  trace: string[]
  sessionId: string
}

type SubmitResponse = { job_id: string; session_id: string; status: string }

type JobResponse = {
  job_id: string
  status: "queued" | "running" | "complete" | "error"
  session_id: string
  content?: string | null
  agent?: string | null
  metadata?: { contributing_agents?: string[] } | null
  error?: string | null
}

export type SendEvalOptions = {
  memberId?: string
  /**
   * Every subject the turn covers, primary first, for a comparative/team run.
   * The agent engine prefers `member_ids` over `member_id` and wraps each owned
   * subject in its own <SUBJECT> block, so the narrator sees the whole
   * comparison set instead of only the primary. Omitted for a solo evaluation.
   */
  memberIds?: string[]
  sessionId?: string
  signal?: AbortSignal
  onStatus?: (status: string) => void
  pollIntervalMs?: number
  timeoutMs?: number
}

/**
 * Ask Meridian to evaluate a member via the async-jobs flow; resolve with the
 * synthesized reply + agent trace. Rejects on job error, timeout, or abort.
 */
export async function sendHonorEvaluation(
  message: string,
  opts: SendEvalOptions = {}
): Promise<HonorEvalReply> {
  const api = getApi()
  const {
    memberId,
    memberIds,
    sessionId,
    signal,
    onStatus,
    pollIntervalMs = 2000,
    timeoutMs = 150_000,
  } = opts

  const { data: sub } = await api.post<SubmitResponse>(
    "/v1/agents/chat/async",
    {
      message,
      session_id: sessionId ?? null,
      context: {
        surface: "honor",
        intent: "member_evaluation",
        member_id: memberId,
        // Only present on a comparative/team run — a solo turn stays byte-identical.
        ...(memberIds && memberIds.length > 1 ? { member_ids: memberIds } : {}),
      },
    },
    { signal }
  )

  const jobId = sub.job_id
  const resolvedSession = sub.session_id || sessionId || ""
  onStatus?.(sub.status || "queued")

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError")
    await new Promise((r) => setTimeout(r, pollIntervalMs))

    let job: JobResponse
    try {
      const { data } = await api.get<JobResponse>(`/v1/agents/chat/jobs/${jobId}`, { signal })
      job = data
    } catch {
      continue // transient poll blip — keep polling to the deadline
    }

    onStatus?.(job.status)
    if (job.status === "complete") {
      return {
        content: job.content ?? "",
        trace: job.metadata?.contributing_agents ?? (job.agent ? [job.agent] : []),
        sessionId: job.session_id || resolvedSession,
      }
    }
    if (job.status === "error") {
      throw new Error(job.error || "The evaluation engine reported an error.")
    }
  }

  throw new Error("Timed out waiting for the evaluation engine.")
}
