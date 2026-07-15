import { registerVertical } from "@/verticals/core"

/**
 * GRANT's declaration to Vertical Core — the reference implementation.
 *
 * GRANT's domain code (pages, services, hooks, types) stays where it is; this
 * module is only the binding to Core. Backend counterpart:
 * `services/agent-engine/app/verticals/grant.py`.
 */
export const GRANT = registerVertical({
  key: "grant",
  title: "GRANT",
  description: "Financial-aid guidance: FAFSA deadlines, scholarships, net price, loans.",
  routePrefix: "/vertical/grant",
  homePath: "/vertical/grant/dashboard",
  accent: "#3B5BFF",
})
