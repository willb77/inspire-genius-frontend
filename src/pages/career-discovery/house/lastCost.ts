import type { CostQuery } from "@/types/career-discovery"
import { costQueryFrom } from "../costQuery"

/**
 * House style (career-education): the last cost-and-payback query this tab
 * opened, so "Cost and payback" from a menu is not a dead end.
 *
 * Session storage, not local: it lives only as long as the tab, so a shared
 * computer (a school lab) does not hand the next person someone else's choice.
 * Display convenience only — the server still checks every request.
 */
const KEY = "career_discovery_last_cost"

export function costSearch(q: CostQuery): string {
  return `?cip=${q.cip}&level=${q.level}&school=${q.school}`
}

/** Remember a search string made by `costSearch`. */
export function rememberCost(search: string): void {
  try {
    sessionStorage.setItem(KEY, search)
  } catch {
    /* private mode / sandboxed storage — nothing to remember */
  }
}

export function recallCost(): CostQuery | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? costQueryFrom(new URLSearchParams(raw)) : null
  } catch {
    return null
  }
}
