/**
 * Where a role's interview surfaces live, and how to deep-link into them.
 *
 * Live Interview and Interview Studio are mounted per role
 * (`/manager/…`, `/practitioner/…`, `/super-admin/…`); a company-admin,
 * distributor or plain user has no route into either, so the helpers return
 * `null` for them and a caller renders nothing rather than a link that 404s.
 *
 * The query-string contract is read by `LiveInterviewBody`:
 *   `?blueprintId=<job dna id>&candidateId=<pipeline candidate id>` — JS-10:
 *     open the live interview with that Job DNA candidate pre-linked;
 *   `?session=<interview session id>` — JS-11: open a stored session (read
 *     only when it is finished).
 */
import { ROUTES } from "@/constants/routes"

const LIVE_BY_ROLE: Record<string, string> = {
  manager: ROUTES.MANAGER.INTERVIEW_LIVE,
  practitioner: ROUTES.PRACTITIONER.INTERVIEW_LIVE,
  "super-admin": ROUTES.SUPER_ADMIN.INTERVIEW_LIVE,
}

/** The Live Interview page for a role, or `null` when the role has none. */
export function liveInterviewPathForRole(role: string | null | undefined): string | null {
  if (!role) return null
  return LIVE_BY_ROLE[role.toLowerCase()] ?? null
}

/** Live Interview with a Job DNA candidate pre-linked (JS-10). */
export function liveInterviewCandidateLink(
  role: string | null | undefined,
  link: { blueprintId: string; candidateId: string },
): string | null {
  const base = liveInterviewPathForRole(role)
  if (!base) return null
  const q = new URLSearchParams({ blueprintId: link.blueprintId, candidateId: link.candidateId })
  return `${base}?${q.toString()}`
}

/** Live Interview opened on a stored session (JS-11's back-link). */
export function liveInterviewSessionLink(
  role: string | null | undefined,
  sessionId: string,
): string | null {
  const base = liveInterviewPathForRole(role)
  if (!base || !sessionId) return null
  const q = new URLSearchParams({ session: sessionId })
  return `${base}?${q.toString()}`
}
