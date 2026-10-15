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
  sendInvites: boolean
}

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
