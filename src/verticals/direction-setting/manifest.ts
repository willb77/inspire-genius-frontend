import { registerVertical } from "@/verticals/core"

/**
 * Direction Setting's declaration to Vertical Core.
 *
 * The guided path from jobless to employed: read the person, explore careers,
 * value them, set goals, align, target a role, size the gap, plan to close it,
 * justify the cost, prepare, rehearse.
 *
 * Deliberately not a new engine. Almost every stage is an existing IG surface —
 * Lumen's Self-Portrait, Summit's goal interview, Job Fit's matches and gaps —
 * and this vertical's job is to sequence them into one journey a person can
 * resume over weeks. Its domain code (pages, services, hooks, types under
 * `src/{pages,services,hooks,types}/direction-setting`) stays where it is; this
 * module is only the binding to Core. Backend counterpart:
 * `services/agent-engine/app/verticals/direction_setting.py`.
 *
 * The key `direction-setting` is the entitlement value, the API segment, and
 * the route segment.
 */
export const DIRECTION_SETTING = registerVertical({
  key: "direction-setting",
  title: "Direction Setting",
  description:
    "The guided path from jobless to employed: read the person, target a role, and close the gap.",
  routePrefix: "/vertical/direction-setting",
  homePath: "/vertical/direction-setting/journey",
  accent: "#127A8A",
})
