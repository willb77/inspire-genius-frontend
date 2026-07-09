/**
 * Summit chat transport — async-jobs flow.
 *
 * Beats the 30s API-Gateway cap on the synchronous `POST /v1/agents/chat`
 * (a full goal-setting turn — intent classification + Summit LLM + Meridian
 * synthesis — routinely exceeds 30s and 503s). Instead:
 *   1. POST /v1/agents/chat/async  → returns a job_id immediately.
 *   2. Poll GET /v1/agents/chat/jobs/{job_id} until a terminal state.
 * Goal-setting intent is routed server-side to the Summit specialist; the
 * server short-circuits goal keywords straight to Summit.
 */
import { getApi } from "@/lib/agentApi";

export type SummitReply = {
  content: string;
  agent: string | null;
  sessionId: string;
  contributingAgents?: string[];
};

type SubmitResponse = { job_id: string; session_id: string; status: string };

type JobResponse = {
  job_id: string;
  status: "queued" | "running" | "complete" | "error";
  session_id: string;
  content?: string | null;
  agent?: string | null;
  metadata?: { contributing_agents?: string[] } | null;
  error?: string | null;
};

export type SendOptions = {
  sessionId?: string;
  signal?: AbortSignal;
  onStatus?: (status: string) => void;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

/**
 * Send a message to the agent engine via the async-jobs flow and resolve with
 * the final reply. Rejects on job error, timeout, or abort.
 */
export async function sendSummitMessage(
  message: string,
  opts: SendOptions = {},
): Promise<SummitReply> {
  const api = getApi();
  const {
    sessionId,
    signal,
    onStatus,
    pollIntervalMs = 2000,
    timeoutMs = 150_000,
  } = opts;

  const { data: sub } = await api.post<SubmitResponse>(
    "/v1/agents/chat/async",
    {
      message,
      session_id: sessionId ?? null,
      context: { surface: "summit", intent: "goal_setting" },
    },
    { signal },
  );

  const jobId = sub.job_id;
  const resolvedSession = sub.session_id || sessionId || "";
  onStatus?.(sub.status || "queued");

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    let job: JobResponse;
    try {
      const { data } = await api.get<JobResponse>(
        `/v1/agents/chat/jobs/${jobId}`,
        { signal },
      );
      job = data;
    } catch {
      // Transient poll failure (network blip / brief 5xx) — keep polling
      // until the deadline rather than failing the whole turn.
      continue;
    }

    onStatus?.(job.status);
    if (job.status === "complete") {
      return {
        content: job.content ?? "",
        agent: job.agent ?? null,
        sessionId: job.session_id || resolvedSession,
        contributingAgents: job.metadata?.contributing_agents,
      };
    }
    if (job.status === "error") {
      throw new Error(job.error || "The goal-setting engine reported an error.");
    }
  }

  throw new Error("Timed out waiting for the goal-setting engine.");
}
