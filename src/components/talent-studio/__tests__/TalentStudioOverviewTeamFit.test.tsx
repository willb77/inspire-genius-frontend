/**
 * @jest-environment jsdom
 *
 * TS-4a — the Team fit stage on the Talent Studio Overview page, under the
 * same gate as its menu row: `job_fit_v2` on AND the build's Team fit flags on,
 * for manager and practitioner only.
 *
 * The other Overview stages only regroup pages the role already reaches, so
 * they do not read the switch (TalentStudioOverviewBody.test.tsx pins that, in
 * a build with the Team fit flags off). Team fit opens a page about other
 * people, so it does.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { act, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"
import "@/verticals"
import type { UserRole } from "@/types/roles"

let mockSwitchOn = true
jest.mock("@/services/job-fit/savedJobs.service", () => ({
  getSavedJobsEnabled: () => Promise.resolve(mockSwitchOn),
  getSavedJobs: () => Promise.resolve([]),
  saveJob: jest.fn(),
  removeSavedJob: jest.fn(),
}))
let mockTeamFitBuild = true
jest.mock("@/constants/teamFit", () => ({
  get TEAM_FIT_BUILD_ENABLED() {
    return mockTeamFitBuild
  },
  TEAM_FIT_PAGE_SIZE: 25,
}))
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => ({
    data: ["job-blueprint", "job-fit", "knowledge-continuity"],
    isLoading: false,
  }),
}))
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => false,
}))
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: false } }),
}))

import TalentStudioOverviewBody from "../TalentStudioOverviewBody"
import { hasAccess } from "@/types/roles"

const ROUTES_SOURCE = readFileSync(join(process.cwd(), "src/routes.tsx"), "utf8")

async function page(role: UserRole): Promise<{ headings: string[]; links: string[] }> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await client.prefetchQuery({ queryKey: ["saved-jobs", "enabled"], queryFn: () => Promise.resolve(mockSwitchOn) })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  const { unmount } = render(<TalentStudioOverviewBody role={role} />, { wrapper })
  await act(async () => {})
  const headings = screen.queryAllByRole("heading", { level: 2 }).map((h) => h.textContent ?? "")
  const links = screen.queryAllByRole("link").map((a) => a.getAttribute("href") ?? "")
  unmount()
  return { headings, links }
}

const teamFitLinks = (links: string[]) => links.filter((to) => to.endsWith("/team-fit"))

beforeEach(() => {
  mockSwitchOn = true
  mockTeamFitBuild = true
})

describe("TS-4a — Team fit on the Talent Studio Overview", () => {
  it.each(["manager", "practitioner"] as UserRole[])(
    "%s: a Team fit stage between Insights and Retain, linking to the role's own routed page",
    async (role) => {
      const { headings, links } = await page(role)
      expect(headings).toEqual(["1.Roles", "2.Candidates", "3.Interviews", "4.Insights", "5.Team fit", "6.Retain"])
      const to = `/${role}/team-fit`
      expect(teamFitLinks(links)).toEqual([to])
      expect(hasAccess(role, to)).toBe(true)
      expect(ROUTES_SOURCE.includes(`path: "${to}"`)).toBe(true)
    },
  )

  it("super-admin: no Team fit stage and no Team fit link, with every flag on", async () => {
    const { headings, links } = await page("super-admin")
    expect(headings.length).toBeGreaterThan(0)
    expect(headings.filter((h) => h.includes("Team fit"))).toEqual([])
    expect(teamFitLinks(links)).toEqual([])
  })

  it.each(["manager", "practitioner", "super-admin"] as UserRole[])(
    "%s: with job_fit_v2 off there is no Team fit stage, and the rest of the page is as before",
    async (role) => {
      const on = await page(role)
      mockSwitchOn = false
      const off = await page(role)
      expect(off.headings.filter((h) => h.includes("Team fit"))).toEqual([])
      expect(teamFitLinks(off.links)).toEqual([])
      expect(off.links).toEqual(on.links.filter((to) => !to.endsWith("/team-fit")))
      expect(off.links.length).toBeGreaterThan(0)
    },
  )

  it.each(["manager", "practitioner"] as UserRole[])(
    "%s: with the build flags off there is no Team fit stage, switch on or not",
    async (role) => {
      mockTeamFitBuild = false
      const { headings, links } = await page(role)
      expect(headings).toEqual(["1.Roles", "2.Candidates", "3.Interviews", "4.Insights", "5.Retain"])
      expect(teamFitLinks(links)).toEqual([])
    },
  )

  it.each(["user", "company-admin", "distributor"] as UserRole[])("%s: nothing at all", async (role) => {
    expect(await page(role)).toEqual({ headings: [], links: [] })
  })
})
