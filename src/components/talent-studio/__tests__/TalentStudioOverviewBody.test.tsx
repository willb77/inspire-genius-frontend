/**
 * @jest-environment jsdom
 *
 * TS-2 — the Talent Studio Overview page offers only links its role can open.
 *
 * The page is links and nothing else, so the one way it can be wrong is a link
 * that goes nowhere: a route under another role's prefix (ProtectedRoute would
 * send the person home), a path that is not routed, or a vertical page the
 * person is not entitled to (the vertical's layout would send them home).
 * Each is checked here against the real things that decide it: `hasAccess`
 * (ROLE_PERMISSIONS), the route table, and the entitlement list.
 *
 * It also pins that the page is the menu: with `job_fit_v2` on, the links are
 * exactly the live rows of the sidebar's Talent Studio group, minus Overview.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { act, render, renderHook, screen, within } from "@testing-library/react"
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

const ALL_VERTICALS = [
  "grant",
  "honor",
  "job-blueprint",
  "job-fit",
  "knowledge-continuity",
  "lumen",
  "direction-setting",
  "career-discovery",
]
let mockEntitled: string[] | undefined = ALL_VERTICALS
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => ({ data: mockEntitled, isLoading: mockEntitled === undefined }),
}))
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => false,
}))
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: false } }),
}))

import TalentStudioOverviewBody from "../TalentStudioOverviewBody"
import { hasAccess } from "@/types/roles"
import { TALENT_STUDIO_LABEL, useTalentStudioStages, useToolsSection } from "@/hooks/nav/useToolsSection"
import { TALENT_STUDIO_STAGE_ROWS } from "@/constants/navigation"
import { FORCE_DISABLED_VERTICALS } from "@/components/layout/useVerticalLauncher"

const TOOL_ROLES: UserRole[] = ["super-admin", "manager", "practitioner"]
const ENTITLEMENTS: Record<string, string[] | undefined> = { all: ALL_VERTICALS, none: [], loading: undefined }
const ROLE_PREFIXES = ["/super-admin", "/manager", "/company-admin", "/practitioner", "/distributor"]
const ROUTES_SOURCE = readFileSync(join(process.cwd(), "src/routes.tsx"), "utf8")

async function wrapperFor(switchOn: boolean) {
  mockSwitchOn = switchOn
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await client.prefetchQuery({ queryKey: ["saved-jobs", "enabled"], queryFn: () => Promise.resolve(switchOn) })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

/** The page as rendered: every link's destination, and every locked row's text. */
async function page(role: UserRole, switchOn = true): Promise<{ links: string[]; locked: string[]; headings: string[] }> {
  const { unmount } = render(<TalentStudioOverviewBody role={role} />, { wrapper: await wrapperFor(switchOn) })
  await act(async () => {})
  const links = screen.queryAllByRole("link").map((a) => a.getAttribute("href") ?? "")
  const locked = [...document.querySelectorAll("span[title]")].map((el) => el.textContent ?? "")
  const headings = screen.queryAllByRole("heading", { level: 2 }).map((h) => h.textContent ?? "")
  unmount()
  return { links, locked, headings }
}

/**
 * The live pages the sidebar's Talent Studio group opens (switch on), minus
 * Overview. Since RM-7 the group is one row per stage and a stage's pages are
 * its tabs, so this is every live tab of every stage the group has a row for.
 */
async function menuLinks(role: UserRole): Promise<string[]> {
  const { result, unmount } = renderHook(
    () => ({ section: useToolsSection(role), stages: useTalentStudioStages(role) }),
    { wrapper: await wrapperFor(true) },
  )
  await act(async () => {})
  const { section, stages } = result.current
  const group = section?.items.find((i) => i.label === TALENT_STUDIO_LABEL)
  unmount()
  const rows = new Set((group?.children ?? []).map((c) => c.label))
  return stages
    .filter((s) => rows.has(TALENT_STUDIO_STAGE_ROWS[s.key].label))
    .flatMap((s) => s.rows)
    .filter((c) => !c.disabled && c.label !== "Overview")
    .map((c) => c.to)
}

/** Can this role, with these entitlements, open this path? The real gates, not the page's own list. */
function canOpen(role: UserRole, to: string, entitled: string[]): boolean {
  if (ROLE_PREFIXES.some((p) => to.startsWith(p))) {
    return hasAccess(role, to) && ROUTES_SOURCE.includes(`path: "${to}"`)
  }
  const vertical = /^\/vertical\/([^/]+)\/(.+)$/.exec(to)
  if (vertical) {
    const [, key, child] = vertical
    return (
      entitled.includes(key) &&
      ROUTES_SOURCE.includes(`path: "/vertical/${key}"`) &&
      ROUTES_SOURCE.includes(`{ path: "${child}", element`)
    )
  }
  return false
}

beforeEach(() => {
  mockEntitled = ALL_VERTICALS
  mockSwitchOn = true
})

describe("TS-2 — Talent Studio Overview offers only links the role can open", () => {
  let checked = 0

  it.each(TOOL_ROLES)("%s: every link opens for this role, in every entitlement state", async (role) => {
    for (const [ent, list] of Object.entries(ENTITLEMENTS)) {
      mockEntitled = list
      const { links } = await page(role)
      expect(links.length).toBeGreaterThan(0)
      for (const to of links) {
        expect({ role, ent, to, opens: canOpen(role, to, list ?? []) }).toEqual({ role, ent, to, opens: true })
        checked++
      }
      // No link back to the page itself, and none twice.
      expect(links.filter((to) => to.endsWith("/talent-studio"))).toEqual([])
      expect(new Set(links).size).toBe(links.length)
    }
  })

  it("checked a real number of links (a walker over nothing proves nothing)", () => {
    // 3 roles; entitled: 6 + 10 + 8 links (TS-5: the manager's Job DNA link);
    // unentitled and loading: 2 + 5 + 4 each (Job DNA is locked text there).
    expect(checked).toBe(24 + 11 + 11)
  })

  it("the check can fail: another role's page and an unentitled vertical page do not open", () => {
    expect(canOpen("practitioner", "/manager/interview-live", ALL_VERTICALS)).toBe(false)
    expect(canOpen("manager", "/manager/not-a-page", ALL_VERTICALS)).toBe(false)
    expect(canOpen("manager", "/vertical/job-blueprint/candidates", [])).toBe(false)
    expect(canOpen("manager", "/vertical/job-blueprint/candidates", ALL_VERTICALS)).toBe(true)
    expect(canOpen("manager", "/manager/interview-live", [])).toBe(true)
  })

  it.each(TOOL_ROLES)("%s: the links are the live rows of the menu group, in the same order", async (role) => {
    for (const list of Object.values(ENTITLEMENTS)) {
      mockEntitled = list
      expect((await page(role)).links).toEqual(await menuLinks(role))
    }
  })

  // RM-3 (2026-11-25): an unentitled vertical's pages are left OUT, not shown as
  // locked text. Stages left with no rows (Candidates, Insights, Retain) go too.
  it.each(TOOL_ROLES)("%s: an unentitled vertical page is absent — no link, no locked text", async (role) => {
    mockEntitled = []
    const { links, locked, headings } = await page(role)
    expect(links.filter((to) => to.startsWith("/vertical/"))).toEqual([])
    expect(locked).toEqual([])
    for (const stage of ["Candidates", "Insights", "Retain"]) {
      expect(headings.some((h) => h.includes(stage))).toBe(false)
    }
    mockEntitled = ALL_VERTICALS
    expect((await page(role)).locked).toEqual([])
  })

  it.each(TOOL_ROLES)("%s: a force-disabled vertical page is text with 'Temporarily unavailable', never a link", async (role) => {
    FORCE_DISABLED_VERTICALS.add("job-blueprint")
    try {
      mockEntitled = ALL_VERTICALS
      const { links, locked } = await page(role)
      expect(links.filter((to) => to.startsWith("/vertical/job-blueprint"))).toEqual([])
      // Role Blueprints, Candidates and Insights; for the manager also Job DNA.
      expect(locked).toHaveLength(role === "manager" ? 4 : 3)
      for (const text of locked) expect(text).toMatch(/Temporarily unavailable/)
    } finally {
      FORCE_DISABLED_VERTICALS.delete("job-blueprint")
    }
  })

  // ── TS-5 ──────────────────────────────────────────────────────────────────
  const rolesStage = () => screen.getByRole("heading", { level: 2, name: /Roles/ }).closest("section") as HTMLElement

  it("manager: the Roles stage lists Job DNA, after Role Blueprints, as a link to the manager's page", async () => {
    const { unmount } = render(<TalentStudioOverviewBody role="manager" />, { wrapper: await wrapperFor(true) })
    await act(async () => {})
    const links = within(rolesStage()).getAllByRole("link")
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Role Blueprints", "/vertical/job-blueprint/dashboard"],
      ["Job DNA", "/manager/job-dna"],
      ["Role Blueprint Match", "/manager/job-blueprint"],
    ])
    unmount()
  })

  it("manager: without the Role Blueprints vertical, Job DNA is absent (RM-3: hidden, not locked)", async () => {
    mockEntitled = []
    const { unmount } = render(<TalentStudioOverviewBody role="manager" />, { wrapper: await wrapperFor(true) })
    await act(async () => {})
    const stage = rolesStage()
    expect(within(stage).queryByRole("link", { name: "Job DNA" })).toBeNull()
    expect(within(stage).queryByText(/Job DNA/)).toBeNull()
    expect(stage.querySelectorAll("span[title]")).toHaveLength(0)
    unmount()
  })

  it.each(["practitioner", "super-admin"] as UserRole[])("%s: the page does not mention Job DNA", async (role) => {
    for (const list of Object.values(ENTITLEMENTS)) {
      mockEntitled = list
      const { links, locked } = await page(role)
      expect(links.length).toBeGreaterThan(0)
      expect(links.filter((to) => to.endsWith("/job-dna"))).toEqual([])
      expect(locked.filter((text) => text.includes("Job DNA"))).toEqual([])
    }
  })

  it("the stages are headed in the order the work runs, and Retain is its own heading", async () => {
    const { headings } = await page("manager")
    expect(headings).toEqual(["1.Roles", "2.Candidates", "3.Interviews", "4.Insights", "5.Retain"])
  })

  // Team fit (TS-4a) is the one stage that DOES follow the switch; it is off in
  // this file's build and pinned in TalentStudioOverviewTeamFit.test.tsx.
  it("the page does not depend on job_fit_v2: same links with the switch off", async () => {
    for (const role of TOOL_ROLES) {
      expect((await page(role, false)).links).toEqual((await page(role, true)).links)
    }
  })

  it("a role with no Tools section gets no links", async () => {
    for (const role of ["user", "company-admin", "distributor"] as UserRole[]) {
      const { links, headings } = await page(role)
      expect({ role, links, headings }).toEqual({ role, links: [], headings: [] })
    }
  })

  it("shows the title and names nobody: no figures, no table, no form", async () => {
    render(<TalentStudioOverviewBody role="manager" />, { wrapper: await wrapperFor(true) })
    await act(async () => {})
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(TALENT_STUDIO_LABEL)
    expect(screen.queryByRole("table")).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    const retain = screen.getByRole("heading", { level: 2, name: /Retain/ }).closest("section") as HTMLElement
    expect(within(retain).getAllByRole("link")).toHaveLength(1)
    expect(within(retain).getByRole("link")).toHaveAttribute("href", "/vertical/knowledge-continuity/dashboard")
  })
})
