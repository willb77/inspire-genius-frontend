import { ROUTES } from "@/constants/routes"
import type { WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import type { LiveSessionSummary } from "@/services/interview/live.service"
import { englishT, type TFn } from "@/components/interview/tFallback"

/**
 * House style (interview area): where the interviewer pages link to, and where
 * a stored session opens. Plain functions so the components stay
 * component-only files.
 */

export type InterviewPage = "studio" | "live" | "prep"

type LinkDef = { to: string; label: string }

/** The links an interviewer's page offers, so no interview page is reachable only by address. */
export function interviewLinksFor(audience: WorkspaceAudience, current: InterviewPage, t: TFn = englishT): LinkDef[] {
  const r = audience === "practitioner" ? ROUTES.PRACTITIONER : ROUTES.MANAGER
  const links: LinkDef[] = []
  // Only managers have a list page today.
  if (audience === "manager") links.push({ to: ROUTES.MANAGER.INTERVIEWS, label: t("house.links.past", "Past interviews") })
  if (current === "prep") {
    links.push({ to: r.INTERVIEW_STUDIO, label: t("house.links.run", "Run an interview") })
  } else {
    links.push({ to: r.INTERVIEW_PREP, label: t("house.links.prepare", "Prepare questions") })
  }
  return links
}

const isStudio = (s: LiveSessionSummary) => (s.frame?.mode ?? "star") === "custom"

export function kindLabel(s: LiveSessionSummary, t: TFn = englishT): string {
  if (!isStudio(s)) return t("house.kind.hiring", "Hiring")
  return s.frame?.kind === "general"
    ? t("house.kind.development", "Development conversation")
    : t("house.kind.own", "Your own questions")
}

/** The page that opens this session, with the session named in the address. */
export function openHref(s: LiveSessionSummary): string {
  const base = isStudio(s) ? ROUTES.MANAGER.INTERVIEW_STUDIO : ROUTES.MANAGER.INTERVIEW_LIVE
  return `${base}?session=${encodeURIComponent(s.id)}`
}
