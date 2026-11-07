import { ROUTES } from "@/constants/routes"
import type { WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import type { LiveSessionSummary } from "@/services/interview/live.service"

/**
 * House style (interview area): where the interviewer pages link to, and where
 * a stored session opens. Plain functions so the components stay
 * component-only files.
 */

export type InterviewPage = "studio" | "live" | "prep"

type LinkDef = { to: string; label: string }

/** The links an interviewer's page offers, so no interview page is reachable only by address. */
export function interviewLinksFor(audience: WorkspaceAudience, current: InterviewPage): LinkDef[] {
  const r = audience === "practitioner" ? ROUTES.PRACTITIONER : ROUTES.MANAGER
  const links: LinkDef[] = []
  // Only managers have a list page today.
  if (audience === "manager") links.push({ to: ROUTES.MANAGER.INTERVIEWS, label: "Past interviews" })
  if (current === "prep") {
    links.push({ to: r.INTERVIEW_STUDIO, label: "Run an interview" })
  } else {
    links.push({ to: r.INTERVIEW_PREP, label: "Prepare questions" })
  }
  return links
}

const isStudio = (s: LiveSessionSummary) => (s.frame?.mode ?? "star") === "custom"

export function kindLabel(s: LiveSessionSummary): string {
  if (!isStudio(s)) return "Hiring"
  return s.frame?.kind === "general" ? "Development conversation" : "Your own questions"
}

/** The page that opens this session, with the session named in the address. */
export function openHref(s: LiveSessionSummary): string {
  const base = isStudio(s) ? ROUTES.MANAGER.INTERVIEW_STUDIO : ROUTES.MANAGER.INTERVIEW_LIVE
  return `${base}?session=${encodeURIComponent(s.id)}`
}
