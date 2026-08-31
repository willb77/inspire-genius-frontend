/**
 * The manager roster contract, as returned by dashboard-service
 * `GET /api/manager/team`.
 *
 * One source of truth as of 2026-08-16. The endpoint used to read
 * dashboard-service's own `team_members` table, which no code has ever written
 * to — 0 rows in dev and staging-b alike, so every manager surface rendered
 * empty (and this page papered over it with six hardcoded people). It now reads
 * the live relation, `employee_profiles.manager_id -> user_profiles.id`, the
 * same one growth-service's Team Development dossier reads.
 */

/** PRISM primary colour. There is no Orange in the four-colour brain map used
 *  by the UI, but the stored assessment carries an `orange` component, so the
 *  API can return it — treat it as a fourth value, not as a token to style. */
export type PrismColor = "gold" | "green" | "blue" | "orange"

export type ManagerTeamMember = {
  /** `employee_profiles.id` — the employment record, not the user. */
  id: string
  /** `users.user_id` — the id every other service keys a person by. */
  user_id: string
  name: string
  email: string
  role: string
  department: string | null
  position: string | null
  prism_color: PrismColor | null
  /**
   * Reported as 0 / null by the backend today: it has no measurement for
   * either against the live relation. Kept in the type because the API sends
   * them, and rendering "—" for an honest absence is the point — the previous
   * page showed a fabricated 91% that was indistinguishable from a real one.
   */
  training_completion: number
  last_active: string | null
}

export type ManagerTeamResponse = {
  members: ManagerTeamMember[]
  total: number
  /**
   * Why the list is empty, when it is. `"no_assignments"` means the query ran
   * and this manager owns nobody — distinct from a failed load, which the UI
   * otherwise cannot tell apart from a zero.
   */
  empty_reason: string | null
}
