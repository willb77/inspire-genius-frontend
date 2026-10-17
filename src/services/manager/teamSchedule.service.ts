/**
 * Manager team scheduling (MSCH-1).
 *
 * Calls the AGENT ENGINE (`agentApi`), at its own manager routes. It does not
 * reuse the practitioner `coachClient` scheduler: that one admits only
 * practitioners and super-admins and books only paying clients, so every
 * manager request to it was a 403 (staging-b, 2026-10-15).
 *
 * No manager id is ever sent. The server takes the manager from the token and
 * books only people whose manager of record that is.
 */

import { agentApi } from "@/lib/agentApi"
import type {
  TeamScheduleInput,
  TeamSchedulePreferences,
  TeamScheduleResult,
  TeamSession,
} from "@/types/manager/teamSchedule"

type Envelope<T> = { status?: boolean; data?: T }

export async function listTeamSchedule(): Promise<TeamSession[]> {
  const r = await agentApi.get<Envelope<TeamSession[]>>("/v1/agents/coach/team-schedule")
  return r.data?.data ?? []
}

/**
 * `startsAt` from a `datetime-local` input has no offset. It is converted here,
 * in the browser that knows the manager's timezone, to a UTC instant; the
 * server refuses a time without one rather than guessing.
 */
export function toUtcInstant(localDateTime: string): string {
  const d = new Date(localDateTime)
  if (Number.isNaN(d.getTime())) throw new Error("Start time is not a valid date")
  return d.toISOString()
}

const PREFERENCES_PATH = "/v1/agents/coach/team-schedule/preferences"

/** The caller's own saved default location. No user id is sent: the server keys it on the token. */
export async function getTeamSchedulePreferences(): Promise<TeamSchedulePreferences> {
  const r = await agentApi.get<Envelope<TeamSchedulePreferences>>(PREFERENCES_PATH)
  return { defaultLocation: r.data?.data?.defaultLocation ?? null }
}

export async function saveTeamSchedulePreferences(
  prefs: TeamSchedulePreferences,
): Promise<TeamSchedulePreferences> {
  const r = await agentApi.put<Envelope<TeamSchedulePreferences>>(PREFERENCES_PATH, prefs)
  const d = r.data?.data
  if (!d) throw new Error("The server returned no saved preference")
  return { defaultLocation: d.defaultLocation ?? null }
}

export async function createTeamSessions(input: TeamScheduleInput): Promise<TeamScheduleResult> {
  const r = await agentApi.post<Envelope<TeamScheduleResult>>(
    "/v1/agents/coach/team-schedule/sessions",
    input,
  )
  const d = r.data?.data
  if (!d) throw new Error("The server returned no scheduling result")
  return {
    created: Number(d.created ?? 0),
    sessions: d.sessions ?? [],
    skipped: d.skipped ?? [],
    emailed: Number(d.emailed ?? 0),
    notEmailed: d.notEmailed ?? [],
  }
}
