/**
 * When a sidebar row counts as "the page you are on". Pure, so the rule can be
 * tested without rendering the sidebar, and shared by the Talent Studio stage
 * tabs so the menu and the tabs cannot disagree about which page is open.
 */

/** The fields of a nav row the rule reads. */
export type NavActiveFields = {
  to: string
  activePrefix?: string
  activePaths?: readonly string[]
}

/** `pathname` is `path` itself or a page under it (`path` + "/…"). */
export function pathIsAt(pathname: string, path: string): boolean {
  return path !== "" && (pathname === path || pathname.startsWith(`${path}/`))
}

/**
 * Active on any of `activePaths` (each the page itself or a page under it),
 * otherwise exactly as before `activePaths` existed: under `activePrefix` when
 * set, else on an exact `to`. A row without `activePaths` behaves as it always
 * has.
 */
export function isItemActive(pathname: string, item: NavActiveFields): boolean {
  if (item.activePaths?.some((p) => pathIsAt(pathname, p))) return true
  return item.activePrefix ? pathname.startsWith(item.activePrefix) : item.to !== "" && pathname === item.to
}
