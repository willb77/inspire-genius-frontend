import { FIT_ENGINE_MATCHES_ENABLED } from "@/constants/development"

/**
 * TS-4a — the BUILD half of the Team fit gate.
 *
 * Team fit shows the fit engine's existing matches for the people a manager or
 * practitioner already has in Team Development Studio, and opens the member
 * there. So it needs both things that page needs from the build:
 *
 *   - `VITE_FEATURE_FIT_ENGINE_MATCHES` — the growth-service fit-matches route
 *     is only ever called by a build with this on (a tier without the route is
 *     never asked for it). Team fit keeps that promise.
 *   - `VITE_FEATURE_TEAM_DEVELOPMENT` — whether this build offers Team
 *     Development Studio at all. Without it there is no roster to show.
 *
 * The other half is the server switch `job_fit_v2` (`useSavedJobsEnabled`),
 * which is per organisation. The row and the page need BOTH halves.
 *
 * Like every build flag this decides what the browser offers. It is not a
 * security boundary: the server checks the caller's relationship to the member
 * and the member's sharing on every read.
 */
export const TEAM_FIT_BUILD_ENABLED =
  FIT_ENGINE_MATCHES_ENABLED && import.meta.env.VITE_FEATURE_TEAM_DEVELOPMENT === "true"

/**
 * How many roster rows the page draws before "Show more". Drawing a row makes
 * no request; this only keeps a long roster readable.
 */
export const TEAM_FIT_PAGE_SIZE = 25
