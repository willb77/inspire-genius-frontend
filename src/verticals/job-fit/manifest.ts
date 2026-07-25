import { registerVertical } from "@/verticals/core"

/**
 * Job-Fit's declaration to Vertical Core.
 *
 * Person-side vertical: a logged-in user matches their OWN PRISM profile
 * against published Job DNAs (fit ranking, gaps, interview prep). Domain code
 * (pages, services, hooks, types) lives outside this module; this is only the
 * binding to Core. Backed by blueprint-service `/v1/blueprint/fit/*`.
 *
 * Left OUT of `DETAILED_VERTICALS` in the launcher, so it surfaces as a single
 * launcher link (its sub-nav lives inside the vertical, not the app sidebar).
 */
export const JOB_FIT = registerVertical({
  key: "job-fit",
  title: "Job Fit",
  description:
    "Match your behavioral profile to open roles: fit ranking, gaps, and interview prep.",
  routePrefix: "/vertical/job-fit",
  homePath: "/vertical/job-fit/matches",
  accent: "#0D9488",
})
