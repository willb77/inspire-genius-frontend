import type { TFunction } from "i18next"

/**
 * Display names for the routes; the wire values are lower-case. Resolved at
 * render (a module-level constant cannot call `t`); an unknown value is shown
 * as it came.
 */
export function routeLabel(t: TFunction, route: string): string {
  switch (route) {
    case "apprentice":
      return t("decisionPath.route.apprentice", { defaultValue: "Apprentice" })
    case "residency":
      return t("decisionPath.route.residency", { defaultValue: "Residency" })
    case "refer":
      return t("decisionPath.route.refer", { defaultValue: "Refer" })
    case "hold":
      return t("decisionPath.route.hold", { defaultValue: "Hold" })
    default:
      return route
  }
}
