import type { RecommendedRoute } from "@/types/job-blueprint"

/** Display names for the routes; the wire values are lower-case. */
export const ROUTE_LABEL: Record<RecommendedRoute, string> = {
  apprentice: "Apprentice",
  residency: "Residency",
  refer: "Refer",
  hold: "Hold",
}
