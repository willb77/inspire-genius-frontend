import { agentApi } from "@/lib/agentApi"
import type {
  HonorActivityItem,
  HonorApiResponse,
  HonorGoogleConnect,
  HonorScheduleFeed,
  HonorSession,
  HonorSessionInput,
  HonorSessionPatch,
} from "@/types/honor"

/**
 * Honor Coach Workbench — live Activity + Schedule service layer.
 *
 * Targets the agent-engine Honor router via the `agentApi` instance (direct to
 * ECS, NOT the monolith proxy), Honor envelope `{ status: true, data: … }`.
 * These endpoints are being built in parallel; every read is written to degrade
 * to an empty list when the route 404s / errors, so the surface never crashes
 * before the backend ships. Mutations surface their errors to the caller (toast).
 *
 * Contract:
 *   GET    /v1/agents/honor/coach/activity                 → { items: HonorActivityItem[] }
 *   GET    /v1/agents/honor/coach/schedule                 → { items: HonorSession[] }
 *   POST   /v1/agents/honor/coach/schedule                 (HonorSessionInput) → HonorSession
 *   PATCH  /v1/agents/honor/coach/schedule/{id}            (HonorSessionPatch) → HonorSession
 *   DELETE /v1/agents/honor/coach/schedule/{id}
 *   GET    /v1/agents/honor/coach/schedule/feed-url        → { url }
 *   GET    /v1/agents/honor/coach/schedule/google/connect  → { available, reason }
 */

const COACH = "/v1/agents/honor/coach"

/** Unwrap the Honor envelope: prefer `.data`, tolerate an already-unwrapped body. */
function unwrap<T>(body: HonorApiResponse<T> | T): T | undefined {
  const env = body as HonorApiResponse<T>
  if (env && typeof env === "object" && ("data" in env || "status" in env || "success" in env)) {
    return env.data
  }
  return body as T
}

// ── Activity ─────────────────────────────────────────────────────────────────

/** Coach activity feed, newest first. Returns [] when the endpoint is unavailable. */
export async function getCoachActivityFeed(): Promise<HonorActivityItem[]> {
  const { data } = await agentApi.get<HonorApiResponse<{ items: HonorActivityItem[] }>>(
    `${COACH}/activity`,
  )
  return unwrap(data)?.items ?? []
}

// ── Schedule (read) ──────────────────────────────────────────────────────────

/** All sessions on the coach's schedule. Returns [] when the endpoint is unavailable. */
export async function getCoachSchedule(): Promise<HonorSession[]> {
  const { data } = await agentApi.get<HonorApiResponse<{ items: HonorSession[] }>>(
    `${COACH}/schedule`,
  )
  return unwrap(data)?.items ?? []
}

/** iCal subscribe URL (https .ics). */
export async function getScheduleFeedUrl(): Promise<HonorScheduleFeed | null> {
  const { data } = await agentApi.get<HonorApiResponse<HonorScheduleFeed>>(
    `${COACH}/schedule/feed-url`,
  )
  return unwrap(data) ?? null
}

/** Google Calendar connect capability probe (OAuth is not configured yet). */
export async function getGoogleConnect(): Promise<HonorGoogleConnect> {
  const { data } = await agentApi.get<HonorApiResponse<HonorGoogleConnect>>(
    `${COACH}/schedule/google/connect`,
  )
  return unwrap(data) ?? { available: false, reason: "Not configured" }
}

// ── Schedule (mutations) ─────────────────────────────────────────────────────

/** Create a session. */
export async function createCoachSession(input: HonorSessionInput): Promise<HonorSession | undefined> {
  const { data } = await agentApi.post<HonorApiResponse<HonorSession>>(`${COACH}/schedule`, input)
  return unwrap(data)
}

/** Edit a session. */
export async function updateCoachSession(
  id: string,
  patch: HonorSessionPatch,
): Promise<HonorSession | undefined> {
  const { data } = await agentApi.patch<HonorApiResponse<HonorSession>>(
    `${COACH}/schedule/${encodeURIComponent(id)}`,
    patch,
  )
  return unwrap(data)
}

/** Delete a session. */
export async function deleteCoachSession(id: string): Promise<void> {
  await agentApi.delete(`${COACH}/schedule/${encodeURIComponent(id)}`)
}
