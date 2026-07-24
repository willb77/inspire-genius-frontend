import { registerVertical } from "@/verticals/core"

/**
 * Job DNA's declaration to Vertical Core.
 *
 * Mirrors the GRANT reference implementation: the vertical's domain code
 * (pages, services, hooks, types, components) stays where it is; this module is
 * only the binding to Core. Registering the manifest surfaces the vertical in
 * the launcher, the super-admin entitlement UI, and anything else that lists
 * verticals — no sidebar edit needed.
 *
 * Authoring + management surfaces read the live `/v1/blueprint/*` endpoints
 * through the shared `api` axios instance. The matching / fit path is gated
 * server-side.
 */
export const JOB_BLUEPRINT = registerVertical({
  key: "job-blueprint",
  title: "Job DNA",
  description:
    "Behavioral job blueprints: benchmark a role, screen + rank candidates by fit.",
  routePrefix: "/vertical/job-blueprint",
  homePath: "/vertical/job-blueprint/dashboard",
  accent: "#7C3AED",
})
