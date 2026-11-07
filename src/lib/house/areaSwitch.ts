/**
 * House-style area switches — one per area, OFF by default.
 *
 * The house-style rollout replaces screens one area at a time (admin first,
 * the shared workspace last). Each area's new screens render only when its
 * switch is on; otherwise the existing screen renders unchanged.
 *
 * A switch only chooses which screen to SHOW. It is not a security control:
 * localStorage is invisible to every server-side check, and anyone can set it
 * from the console. Never gate data or an action on it.
 *
 * Precedence: explicit localStorage value > build env list > OFF.
 *   - localStorage `house_style_<area>` = "true" | "false"
 *   - `VITE_HOUSE_STYLE_AREAS` = comma list of areas switched on for a build
 */

export const HOUSE_STYLE_AREAS = [
  "admin",
  "distributor",
  "company-admin",
  "practitioner",
  "manager",
  "programs",
  "workspace",
  "team-development",
  "goals",
  "career-education",
  "interview",
  "resume",
] as const

export type HouseStyleArea = (typeof HOUSE_STYLE_AREAS)[number]

const KEY_PREFIX = "house_style_"

function envAreas(): Set<string> {
  const raw: string = import.meta.env.VITE_HOUSE_STYLE_AREAS || ""
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

/** True when the area's new house-style screens should render. Default: OFF. */
export function isHouseStyleOn(area: HouseStyleArea): boolean {
  try {
    const val = localStorage.getItem(KEY_PREFIX + area)
    if (val === "true") return true
    if (val === "false") return false
  } catch {
    // Private mode / sandboxed storage — fall through to the build default.
  }
  return envAreas().has(area)
}

/** Explicitly set an area's switch (persists to localStorage). Caller reloads to apply. */
export function setHouseStyle(area: HouseStyleArea, on: boolean): void {
  try {
    localStorage.setItem(KEY_PREFIX + area, on ? "true" : "false")
  } catch {
    /* ignore — private-mode / sandboxed storage */
  }
}

/** Clear an area's override so the build default applies again. */
export function clearHouseStyle(area: HouseStyleArea): void {
  try {
    localStorage.removeItem(KEY_PREFIX + area)
  } catch {
    /* ignore */
  }
}
