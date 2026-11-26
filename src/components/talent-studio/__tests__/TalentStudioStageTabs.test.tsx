/**
 * @jest-environment jsdom
 *
 * RM-7 (2026-11-26, Bill's RM-D5) — the tabs of a Talent Studio stage page.
 *
 * Pinned here, through the real `job_fit_v2` signal (only the HTTP call
 * stubbed) and the real vertical registry:
 *   1. The strip: present only with the switch on, on a tab of a stage with two
 *      or more tabs; the open tab marked; a vertical tab says it leaves; a
 *      greyed tab does not navigate. Off (loading, error, false) it is nothing.
 *   2. Every old route opens INSIDE its stage page: for every role and every
 *      tab of a multi-tab stage that is not a vertical page (vertical pages are
 *      not edited, ruling 1 of the RM-7 GO), the page file that owns the route
 *      renders the strip for that role. A new tab with no strip fails here.
 *   3. Where the Interviews tabs show, the house-style interview link row does
 *      not (ruling 2); with the switch off it is exactly as before.
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { act, render, renderHook, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"
import "@/verticals"
import type { UserRole } from "@/types/roles"

type Mode = "loading" | "error" | "false" | "true"
let mockMode: Mode = "true"
jest.mock("@/services/job-fit/savedJobs.service", () => ({
  getSavedJobsEnabled: () => {
    if (mockMode === "loading") return new Promise<boolean>(() => {})
    if (mockMode === "error") return Promise.reject(new Error("status unreadable"))
    return Promise.resolve(mockMode === "true")
  },
  getSavedJobs: () => Promise.resolve([]),
  saveJob: jest.fn(),
  removeSavedJob: jest.fn(),
}))
const ALL_VERTICALS = ["job-blueprint", "job-fit", "knowledge-continuity"]
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
jest.mock("@/constants/teamFit", () => ({ TEAM_FIT_BUILD_ENABLED: true, TEAM_FIT_PAGE_SIZE: 25 }))
// Section 3 renders the real shared interview pages; their chrome and bodies are not under test.
jest.mock("@/layouts/WorkspaceLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="chrome">{children}</div>,
}))
jest.mock("@/components/interview/LiveInterviewBody", () => ({ __esModule: true, default: () => <div>live body</div> }))
jest.mock("@/components/interview/StudioInterviewBody", () => ({ __esModule: true, default: () => <div>studio body</div> }))
jest.mock("@/components/interview/house/run/InterviewRunBody", () => ({ __esModule: true, default: () => <div>run body</div> }))
jest.mock("@/components/task-agents/InterviewPrepBody", () => ({ __esModule: true, default: () => <div>prep body</div> }))

import TalentStudioStageTabs from "../TalentStudioStageTabs"
import { useTalentStudioStages } from "@/hooks/nav/useToolsSection"
import { FORCE_DISABLED_VERTICALS } from "@/components/layout/useVerticalLauncher"
import { WORKSPACE_ITEM_UNAVAILABLE_REASON } from "@/constants/navigation"
import { setHouseStyle } from "@/lib/house/areaSwitch"
import WorkspaceInterviewLivePage from "@/pages/workspace/InterviewLivePage"
import WorkspaceInterviewStudioPage from "@/pages/workspace/InterviewStudioPage"
import WorkspaceInterviewPrepPage from "@/pages/workspace/InterviewPrepPage"

const TOOL_ROLES: UserRole[] = ["manager", "practitioner", "super-admin"]

async function clientFor(mode: Mode): Promise<QueryClient> {
  mockMode = mode
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (mode !== "loading") {
    const { getSavedJobsEnabled } = jest.requireMock("@/services/job-fit/savedJobs.service")
    await client.prefetchQuery({ queryKey: ["saved-jobs", "enabled"], queryFn: getSavedJobsEnabled }).catch(() => {})
  }
  return client
}

async function renderAt(ui: ReactNode, path: string, mode: Mode = "true") {
  const client = await clientFor(mode)
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
  await act(async () => {})
  return view
}

// The stage strip, not the house-style "Interview pages" link row.
const strip = () => screen.queryByRole("navigation", { name: /^(Overview|Roles|Candidates|Interviews|Insights|Team fit|Retain) pages$/ })

beforeEach(() => {
  localStorage.clear()
  mockEntitled = ALL_VERTICALS
  mockMode = "true"
})

describe("RM-7 — the stage tab strip", () => {
  it("manager on a tab of Interviews: the stage's four tabs, the open one marked, each to its own page", async () => {
    const { unmount } = await renderAt(<TalentStudioStageTabs role="manager" />, "/manager/interview-prep?x=1")
    const nav = strip()
    expect(nav).not.toBeNull()
    expect(nav?.getAttribute("aria-label")).toBe("Interviews pages")
    const links = within(nav as HTMLElement).getAllByRole("link")
    expect(links.map((a) => [a.textContent, a.getAttribute("href"), a.getAttribute("aria-current")])).toEqual([
      ["Hiring interview", "/manager/interview-live", null],
      ["Own-questions interview", "/manager/interview-studio", null],
      ["Prepare questions", "/manager/interview-prep?x=1", "page"],
      ["Past interviews", "/manager/interviews", null],
    ])
    unmount()
  })

  it("manager on Job DNA: the Roles tabs, and the vertical tab says it opens its own page", async () => {
    const { unmount } = await renderAt(<TalentStudioStageTabs role="manager" />, "/manager/job-dna")
    const links = within(strip() as HTMLElement).getAllByRole("link")
    expect(links.map((a) => [a.textContent, a.getAttribute("href"), a.getAttribute("title")])).toEqual([
      ["Role Blueprints", "/vertical/job-blueprint/dashboard", "Opens its own page"],
      ["Job DNA", "/manager/job-dna", null],
      ["Role Blueprint Match", "/manager/job-blueprint", null],
    ])
    unmount()
  })

  it.each(["loading", "error", "false"] as Mode[])("job_fit_v2 %s: no strip anywhere", async (mode) => {
    for (const path of ["/manager/interview-prep", "/manager/job-dna", "/practitioner/interview-live"]) {
      const role = path.split("/")[1] as UserRole
      const { unmount } = await renderAt(<TalentStudioStageTabs role={role} />, path, mode)
      expect({ mode, path, strip: strip() }).toEqual({ mode, path, strip: null })
      unmount()
    }
  })

  it("no strip on a stage of one page, on a page outside Talent Studio, or for a role without the group", async () => {
    for (const [role, path] of [
      ["manager", "/manager/talent-studio"],
      ["manager", "/manager/team-fit"],
      ["manager", "/manager/schedule"],
      ["super-admin", "/vertical/job-blueprint/dashboard"],
      ["user", "/manager/interview-live"],
      ["company-admin", "/manager/interview-live"],
    ] as [UserRole, string][]) {
      const { unmount } = await renderAt(<TalentStudioStageTabs role={role} />, path)
      expect({ role, path, strip: strip() }).toEqual({ role, path, strip: null })
      unmount()
    }
    // The control: the same renderer does draw a strip on a multi-tab stage.
    const { unmount } = await renderAt(<TalentStudioStageTabs role="super-admin" />, "/super-admin/interview-studio")
    expect(strip()).not.toBeNull()
    unmount()
  })

  it("unentitled to job-blueprint, the manager's Roles stage is one page, so Role Blueprint Match has no strip", async () => {
    mockEntitled = []
    const { unmount } = await renderAt(<TalentStudioStageTabs role="manager" />, "/manager/job-blueprint")
    expect(strip()).toBeNull()
    unmount()
  })

  it("a force-disabled vertical's tab is greyed with its reason and is not a link", async () => {
    FORCE_DISABLED_VERTICALS.add("job-blueprint")
    try {
      mockEntitled = ["job-blueprint"]
      const { unmount } = await renderAt(<TalentStudioStageTabs role="manager" />, "/manager/job-blueprint")
      const nav = strip() as HTMLElement
      expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual(["Role Blueprint Match"])
      const greyed = [...nav.querySelectorAll("span[aria-disabled='true']")]
      expect(greyed.map((s) => [s.textContent, s.getAttribute("title")])).toEqual([
        ["Role Blueprints", WORKSPACE_ITEM_UNAVAILABLE_REASON],
        ["Job DNA", WORKSPACE_ITEM_UNAVAILABLE_REASON],
      ])
      unmount()
    } finally {
      FORCE_DISABLED_VERTICALS.delete("job-blueprint")
    }
  })
})

/**
 * Route → the page file that owns it and the role it passes to the strip. A
 * shared workspace page passes its route's audience.
 */
const OWNERS: Record<string, { file: string; role: string }> = {
  "/manager/job-dna": { file: "src/pages/manager/JobDna.tsx", role: '"manager"' },
  "/manager/job-blueprint": { file: "src/pages/workspace/JobBlueprintPage.tsx", role: "{audience}" },
  "/practitioner/job-blueprint": { file: "src/pages/workspace/JobBlueprintPage.tsx", role: "{audience}" },
  "/manager/interview-live": { file: "src/pages/workspace/InterviewLivePage.tsx", role: "{audience}" },
  "/practitioner/interview-live": { file: "src/pages/workspace/InterviewLivePage.tsx", role: "{audience}" },
  "/manager/interview-studio": { file: "src/pages/workspace/InterviewStudioPage.tsx", role: "{audience}" },
  "/practitioner/interview-studio": { file: "src/pages/workspace/InterviewStudioPage.tsx", role: "{audience}" },
  "/manager/interview-prep": { file: "src/pages/workspace/InterviewPrepPage.tsx", role: "{audience}" },
  "/practitioner/interview-prep": { file: "src/pages/workspace/InterviewPrepPage.tsx", role: "{audience}" },
  "/manager/interviews": { file: "src/pages/manager/Interviews.tsx", role: '"manager"' },
  "/super-admin/interview-live": { file: "src/pages/super-admin/InterviewLivePage.tsx", role: '"super-admin"' },
  "/super-admin/interview-studio": { file: "src/pages/super-admin/InterviewStudioPage.tsx", role: '"super-admin"' },
}

describe("RM-7 — every old route opens inside its stage page", () => {
  // Mutation: delete <TalentStudioStageTabs …/> from any one owning page — the
  // route it owns must fail here.
  it.each(TOOL_ROLES)("%s: every tab of a multi-tab stage that is not a vertical page renders the strip", async (role) => {
    const client = await clientFor("true")
    const { result, unmount } = renderHook(() => useTalentStudioStages(role), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      ),
    })
    await act(async () => {})
    const stages = result.current
    unmount()
    let checked = 0
    for (const stage of stages.filter((s) => s.rows.length > 1)) {
      for (const tab of stage.rows) {
        if (tab.to.startsWith("/vertical/")) continue
        const owner = OWNERS[tab.to]
        expect({ route: tab.to, owner: !!owner }).toEqual({ route: tab.to, owner: true })
        const source = readFileSync(join(process.cwd(), owner.file), "utf8")
        expect({ route: tab.to, strip: source.includes(`<TalentStudioStageTabs role=${owner.role} />`) }).toEqual({
          route: tab.to,
          strip: true,
        })
        // And the strip draws on that route, with that tab open.
        const { unmount: done } = await renderAt(<TalentStudioStageTabs role={role} />, tab.to)
        const current = within(strip() as HTMLElement).getByRole("link", { current: "page" })
        expect([tab.to, current.textContent]).toEqual([tab.to, tab.label])
        done()
        checked++
      }
    }
    // manager: 2 Roles + 4 Interviews; practitioner: 1 + 3; super-admin: 0 + 2.
    expect(checked).toBe({ manager: 6, practitioner: 4, "super-admin": 2 }[role as string])
  })
})

describe("RM-7 — the interview link row gives way to the Interviews tabs", () => {
  const PAGES = [
    ["live", WorkspaceInterviewLivePage, "interview-live"],
    ["studio", WorkspaceInterviewStudioPage, "interview-studio"],
    ["prep", WorkspaceInterviewPrepPage, "interview-prep"],
  ] as const

  it.each(PAGES)("%s page, house style on: tabs and no link row with job_fit_v2 on; the link row as before with it off", async (_name, Page, slug) => {
    setHouseStyle("interview", true)
    for (const audience of ["manager", "practitioner"] as const) {
      const linkRow = () => screen.queryByRole("navigation", { name: "Interview pages" })
      const on = await renderAt(<Page audience={audience} />, `/${audience}/${slug}`, "true")
      expect({ audience, tabs: !!strip(), linkRow: !!linkRow() }).toEqual({ audience, tabs: true, linkRow: false })
      on.unmount()
      const off = await renderAt(<Page audience={audience} />, `/${audience}/${slug}`, "false")
      expect({ audience, tabs: !!strip(), linkRow: !!linkRow() }).toEqual({ audience, tabs: false, linkRow: true })
      off.unmount()
    }
  })

  it.each(PAGES)("%s page, house style off: no link row either way, tabs only with job_fit_v2 on", async (_name, Page, slug) => {
    for (const mode of ["true", "false"] as Mode[]) {
      const view = await renderAt(<Page audience="manager" />, `/manager/${slug}`, mode)
      expect({ mode, tabs: !!strip(), linkRow: !!screen.queryByRole("navigation", { name: "Interview pages" }) }).toEqual({
        mode,
        tabs: mode === "true",
        linkRow: false,
      })
      view.unmount()
    }
  })
})
