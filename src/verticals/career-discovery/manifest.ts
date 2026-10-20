import { registerVertical } from "@/verticals/core"

/**
 * Career & Education Discovery's declaration to Vertical Core (DISC-1).
 *
 * A separate product from Direction Setting: written for someone choosing a
 * career and the education to reach it, not for someone between jobs. It reuses
 * the engines underneath (career areas, pay, goals vs wiring, the
 * Self-Portrait) through its own backend routes, and never changes them.
 *
 * The key `career-discovery` is the entitlement value, the API segment and the
 * route segment. Backend counterpart:
 * `services/agent-engine/app/verticals/career_discovery.py`.
 */
export const CAREER_DISCOVERY = registerVertical({
  key: "career-discovery",
  title: "Career & Education Discovery",
  description:
    "For someone choosing a career: who you are, careers that suit you, what they pay, and the education to get there.",
  routePrefix: "/vertical/career-discovery",
  homePath: "/vertical/career-discovery/journey",
  accent: "#127A8A",
})
