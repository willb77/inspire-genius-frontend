import { ROUTES } from "@/constants/routes"
import { CAREERS_AND_JOBS_PATH } from "@/constants/vertical-subnav"

/**
 * Careers and Jobs Phase B — the four phases and the existing pages they open.
 *
 * Links only: every target is a route that already exists, and nothing here
 * changes a route, a stage id or a redirect (CSA Design 5 and 7). The phase
 * names are the owner's (2026-11-25): Know yourself, Explore
 * careers, Check the fit, Plan the route.
 */
export type PhaseKey = "knowYourself" | "exploreCareers" | "checkTheFit" | "planTheRoute"
export type PhaseVertical = "career-discovery" | "job-fit"

type Target = { to: string; needs: PhaseVertical }

type PhaseDef = {
  key: PhaseKey
  /** In preference order; the first one the account can open is used. */
  targets: Target[]
  /** Paths (exact) that belong to this phase, for the "you are here" mark. */
  paths: string[]
  /** Path prefixes that belong to this phase. */
  prefixes?: string[]
}

const CD = ROUTES.CAREER_DISCOVERY

export const PHASES: readonly PhaseDef[] = [
  {
    key: "knowYourself",
    targets: [{ to: CD.JOURNEY, needs: "career-discovery" }],
    paths: [CD.JOURNEY, CD.ABOUT, CD.WHO],
  },
  {
    key: "exploreCareers",
    targets: [
      { to: CAREERS_AND_JOBS_PATH, needs: "job-fit" },
      { to: CD.CAREERS, needs: "career-discovery" },
    ],
    paths: [CD.CAREERS, CD.PAYS],
    prefixes: [`${ROUTES.JOB_FIT.BASE}/`],
  },
  {
    key: "checkTheFit",
    targets: [{ to: CD.GOALS, needs: "career-discovery" }],
    paths: [CD.GOALS, CD.ALIGNMENT],
  },
  {
    key: "planTheRoute",
    targets: [{ to: CD.EDUCATION, needs: "career-discovery" }],
    paths: [CD.EDUCATION, CD.COST, CD.PLAN],
  },
]

export type PhaseItem = { key: PhaseKey; to: string; current: boolean }

/**
 * The phases this account can reach, each with the first target it may open.
 * A phase with no reachable target is left out, so the strip never links to a
 * vertical the account lacks (parent CSA F4: that bounces to /home).
 */
export function phaseItems(entitled: ReadonlySet<PhaseVertical>, pathname: string): PhaseItem[] {
  const out: PhaseItem[] = []
  for (const phase of PHASES) {
    const target = phase.targets.find((t) => entitled.has(t.needs))
    if (!target) continue
    const current =
      phase.paths.includes(pathname) || (phase.prefixes ?? []).some((p) => pathname.startsWith(p))
    out.push({ key: phase.key, to: target.to, current })
  }
  return out
}
