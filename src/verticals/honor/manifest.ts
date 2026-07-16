import { registerVertical } from "@/verticals/core"

/**
 * The Honor Foundation's declaration to Vertical Core.
 *
 * Honor's domain code (pages, services, hooks, types under `src/{pages,services,
 * hooks,types}/honor`) stays where it is; this module is only the binding to
 * Core. Backend counterpart: `services/agent-engine/app/verticals/honor.py`.
 *
 * `accent` is the manifest theme hint. Honor's fuller navy/orange chrome lives
 * in `HonorShell` (the documented Core theming gap) until Core's theme contract
 * grows to express it.
 */
export const HONOR = registerVertical({
  key: "honor",
  title: "Honor Foundation",
  description: "Coach Workbench: roster + caseload for SOF veterans in transition.",
  routePrefix: "/vertical/honor",
  homePath: "/vertical/honor/dashboard",
  accent: "#E8792B",
})
