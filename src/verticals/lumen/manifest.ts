import { registerVertical } from "@/verticals/core"

/**
 * Lumen's declaration to Vertical Core.
 *
 * Lumen is the B2C face of PRISM Diagnostics: personal behavioral diagnostics
 * plus just-in-time ("Moments") coaching for individuals. Its domain code
 * (pages, services, hooks, types under `src/{pages,services,hooks,types}/lumen`)
 * stays where it is; this module is only the binding to Core. Backend
 * counterpart: `services/agent-engine/app/verticals/lumen.py`.
 *
 * Access is entitlement-granted, not purchased — there is no paygate. The key
 * `lumen` is the entitlement value, the API segment, and the route segment.
 */
export const LUMEN = registerVertical({
  key: "lumen",
  title: "Lumen",
  description:
    "Personal behavioral diagnostics + just-in-time coaching for individuals.",
  routePrefix: "/vertical/lumen",
  homePath: "/vertical/lumen/dashboard",
  accent: "#127A8A",
})
