/**
 * Coaches removal (2026-11-19) — an old /my/goals/coaches link still lands.
 *
 * The Coaches page is gone, but the path is kept in the REAL route table as a
 * redirect to My Goals. Walks `routes.tsx` rather than a copy, so deleting the
 * redirect (which would send an old bookmark to the catch-all) fails here.
 * Both house-style states are covered: the redirect lives in the route table,
 * not in the layout, so it must not depend on the `goals` switch.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Outlet, useRoutes, type RouteObject } from "react-router-dom"
import { routes } from "@/routes"

jest.mock("@/pages/summit/GoalsStudioLayout", () => ({ __esModule: true, default: () => <Outlet /> }))
jest.mock("@/pages/summit/SummitGoals", () => ({ __esModule: true, default: () => <div>my-goals-index</div> }))
jest.mock("@/pages/summit/SummitInterview", () => ({ __esModule: true, default: () => <div>interview</div> }))

function goalsStudioRoute(): RouteObject {
  const walk = (rs: RouteObject[]): RouteObject | undefined => {
    for (const r of rs) {
      if (r.path === "/my/goals") return r
      const hit = r.children ? walk(r.children) : undefined
      if (hit) return hit
    }
    return undefined
  }
  const found = walk(routes)
  if (!found) throw new Error("the /my/goals route was not found in the route table")
  return found
}

function Harness({ tree }: { tree: RouteObject }) {
  return useRoutes([tree, { path: "*", element: <div>NO-MATCH</div> }])
}

async function landOn(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Harness tree={goalsStudioRoute()} />
    </MemoryRouter>,
  )
  return screen.findByText(/my-goals-index|interview|NO-MATCH/)
}

beforeEach(() => localStorage.clear())

describe("/my/goals/coaches after the Coaches page was removed", () => {
  it.each([["off", "false"], ["on", "true"]])("redirects to My Goals with house style %s", async (_label, value) => {
    localStorage.setItem("house_style_goals", value)
    expect((await landOn("/my/goals/coaches")).textContent).toBe("my-goals-index")
  })

  it("has no child route that still renders a Coaches page", () => {
    const children = goalsStudioRoute().children ?? []
    const coaches = children.find((c) => c.path === "coaches")
    expect(coaches).toBeDefined()
    // A redirect has no lazy page behind it: its element is a <Navigate>.
    expect((coaches?.element as { props?: { to?: string } })?.props?.to).toBe("/my/goals")
  })

  it("leaves the neighbouring sections where they are", async () => {
    expect((await landOn("/my/goals/interview")).textContent).toBe("interview")
  })
})
