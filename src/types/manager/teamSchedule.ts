/**
 * Manager team scheduling (MSCH-1) — `/v1/agents/coach/team-schedule*`.
 *
 * Shapes match `services/agent-engine/app/coach/routes.py` and
 * `app/coach/team_schedule.py`. A person is a direct report's `user_id`
 * (`ManagerTeamMember.user_id`), not a practitioner client id.
 */

export type TeamSession = {
  sessionId: string
  personId: string
  personName: string
  startsAt: string
  durationMin: number
  topic: string
  /** MSCH-2: a meeting link, phone number or address; null when none was given. */
  location?: string | null
  status: string
}

export type TeamScheduleInput = {
  personIds: string[]
  /** An ISO-8601 instant with an offset. The server refuses a naive time. */
  startsAt: string
  durationMin: number
  spacingMin: number
  topic: string
  message?: string
  /** MSCH-2: one free-text field, up to {@link MAX_LOCATION} characters. */
  location?: string
  sendInvites: boolean
}

/** The server refuses a longer location rather than cutting a link short. */
export const MAX_LOCATION = 500

/** The caller's own scheduling defaults (MSCH-2). */
export type TeamSchedulePreferences = { defaultLocation: string | null }

/** Why a person was not booked. */
export type TeamScheduleSkip = { personId: string; reason: string }

/** A person who was booked but not emailed, and why. */
export type TeamScheduleNotEmailed = { personId: string; reason: string }

export type TeamScheduleResult = {
  created: number
  sessions: TeamSession[]
  skipped: TeamScheduleSkip[]
  emailed: number
  notEmailed: TeamScheduleNotEmailed[]
}
