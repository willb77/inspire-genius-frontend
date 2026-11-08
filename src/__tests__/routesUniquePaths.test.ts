/**
 * Every absolute path in the route table is declared once.
 *
 * `/super-admin/interview-live` was registered twice with identical elements.
 * React Router renders one of them, so nobody saw it, but a second copy is
 * where a later edit to one of them goes unnoticed. Relative child paths
 * ("plan", "goals", …) legitimately repeat under different parents and are not
 * checked here.
 */
import type { RouteObject } from "react-router-dom"
import { matchRoutes } from "react-router-dom"
import { routes } from "@/routes"

function absolutePaths(list: RouteObject[]): string[] {
  return list.flatMap((r) => [
    ...(r.path && r.path.startsWith("/") ? [r.path] : []),
    ...absolutePaths(r.children ?? []),
  ])
}

describe("route table", () => {
  const paths = absolutePaths(routes)

  it("walks the real table (a walker that finds nothing proves nothing)", () => {
    expect(paths.length).toBeGreaterThan(100)
  })

  it("declares no absolute path twice", () => {
    const seen = new Set<string>()
    const dupes = paths.filter((p) => (seen.has(p) ? true : (seen.add(p), false)))
    expect(dupes).toEqual([])
  })

  it("still has the super-admin Live Interview route, exactly once, and it resolves", () => {
    expect(paths.filter((p) => p === "/super-admin/interview-live")).toHaveLength(1)
    const match = matchRoutes(routes, "/super-admin/interview-live")
    expect(match?.[match.length - 1]?.route.path).toBe("/super-admin/interview-live")
  })
})
