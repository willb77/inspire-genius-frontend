/**
 * @jest-environment jsdom
 *
 * JF-8 menu wiring — the three menus that show Career Fit, read through the
 * real `job_fit_v2` signal (JF-7's `useSavedJobsEnabled`, with only the HTTP
 * call stubbed):
 *
 *   - the main menu (`useGatedNavItems` → the workspace splice),
 *   - the left rail inside every vertical (`useVerticalPageSections`),
 *   - Job Fit's pill row (`FitNav`).
 *
 * Off — the status call still pending, failing, or answering `false` — every
 * role's three menus, across every vertical, must be exactly today's. The
 * snapshot in this file was recorded against the code BEFORE the wiring, so a
 * passing run on the wired code is the base-vs-branch identity check.
 *
 * On, the person sees one "Careers and Jobs" entry where "Career Fit", "My fit"
 * and "Growth areas" were; nothing else in any menu moves.
 */
import { render, renderHook, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import type { ReactNode } from "react"
import "@/verticals"
import { CAREERS_AND_JOBS_LABEL, CAREERS_AND_JOBS_PATH } from "@/constants/vertical-subnav"
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import type { VerticalKey } from "@/verticals/core/types"

type Mode = "loading" | "error" | "false" | "true"
let mockMode: Mode = "false"
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

const ENTITLED_TO_ALL = ["job-fit", "career-discovery", "direction-setting", "grant", "lumen"]
let mockEntitled: string[] = ENTITLED_TO_ALL
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => ({ data: mockEntitled, isLoading: false }),
}))
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => false,
}))
jest.mock("@/hooks/super-admin/usePrismExam", () => ({ useExamAccess: () => ({ data: undefined }) }))
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: () => ({ data: undefined }),
}))
jest.mock("@/hooks/super-admin/useBroadcast", () => ({ useBroadcastAccess: () => ({ data: undefined }) }))

let mockRole: UserRole = "user"
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { id: "me", role: mockRole, email: "someone@example.com" } }),
}))

import { useGatedNavItems } from "../useGatedNavItems"
import { useVerticalPageSections } from "../useVerticalPageSections"
import FitNav from "@/pages/job-fit/FitNav"

const ROLES: UserRole[] = ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"]
const VERTICALS: VerticalKey[] = [
  "grant",
  "honor",
  "job-blueprint",
  "job-fit",
  "knowledge-continuity",
  "lumen",
  "direction-setting",
  "career-discovery",
]
const STATUS_KEY = ["saved-jobs", "enabled"]

const show = (items: NavItemDef[]) =>
  items.map((i) => `${i.label} -> ${i.to}${i.disabled ? " (greyed)" : ""}`)
const showSections = (sections: NavSectionDef[]) =>
  sections.map((s) => ({ label: s.label, items: show(s.items) }))

async function clientFor(mode: Mode): Promise<QueryClient> {
  mockMode = mode
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (mode !== "loading") {
    const { getSavedJobsEnabled } = jest.requireMock("@/services/job-fit/savedJobs.service")
    await client.prefetchQuery({ queryKey: STATUS_KEY, queryFn: getSavedJobsEnabled })
  }
  return client
}

type Dump = {
  mainMenu: string[]
  sidebars: Record<string, { label: string; items: string[] }[]>
  pillRow: string[]
}

async function dumpFor(role: UserRole, mode: Mode): Promise<Dump> {
  mockRole = role
  const client = await clientFor(mode)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  const { result, unmount } = renderHook(
    () => ({
      mainMenu: useGatedNavItems(role),
      // Fixed length and order, so the hook order is stable across renders.
      sidebars: VERTICALS.map((v) => useVerticalPageSections(v, role)),
    }),
    { wrapper },
  )
  const mainMenu = show(result.current.mainMenu)
  const sidebars = Object.fromEntries(
    VERTICALS.map((v, i) => [v, showSections(result.current.sidebars[i])]),
  )
  unmount()

  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/vertical/job-fit/pathway"]}>
        <FitNav />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  const nav = screen.getByRole("navigation", { name: "Job Fit tools" })
  const pillRow = within(nav)
    .getAllByRole("link")
    .map((el) => `${el.textContent} -> ${el.getAttribute("href") ?? "(no href)"}${el.getAttribute("aria-disabled") ? " (greyed)" : ""}`)
  view.unmount()
  return { mainMenu, sidebars, pillRow }
}

beforeEach(() => {
  localStorage.clear()
  mockEntitled = ENTITLED_TO_ALL
})

describe("JF-8 menus — job_fit_v2 off is today's, byte for byte", () => {
  it.each(ROLES)("%s: main menu, every vertical's sidebar and the pill row", async (role) => {
    const off = await dumpFor(role, "false")
    // A walker over nothing proves nothing: every vertical answered, and the
    // menus Career Fit lives in are populated.
    expect(Object.keys(off.sidebars)).toEqual(VERTICALS)
    expect(off.mainMenu).toContain("Career Fit -> /vertical/job-fit/matches")
    expect(off.pillRow).toContain("My fit -> /vertical/job-fit/matches")
    expect(off).toMatchSnapshot()
  })

  it.each(ROLES)("%s: still loading and unreadable read exactly like off", async (role) => {
    const off = await dumpFor(role, "false")
    expect(await dumpFor(role, "loading")).toEqual(off)
    expect(await dumpFor(role, "error")).toEqual(off)
  })
})

describe("JF-8 menus — job_fit_v2 on", () => {
  const swapMainEntry = (line: string) =>
    line === "Career Fit -> /vertical/job-fit/matches"
      ? `${CAREERS_AND_JOBS_LABEL} -> ${CAREERS_AND_JOBS_PATH}`
      : line

  it.each(ROLES)("%s: the main menu renames Career Fit in place and changes nothing else", async (role) => {
    const off = await dumpFor(role, "false")
    const on = await dumpFor(role, "true")
    expect(on.mainMenu).toEqual(off.mainMenu.map(swapMainEntry))
    expect(on.mainMenu.filter((l) => l.startsWith(CAREERS_AND_JOBS_LABEL))).toHaveLength(1)
    expect(on.mainMenu.some((l) => l.startsWith("Career Fit"))).toBe(false)
    // Discovery's own door is untouched.
    expect(on.mainMenu).toContain("Career & Education Discovery -> /vertical/career-discovery/journey")
  })

  it.each(ROLES)("%s: the Job Fit pill row drops My fit and Growth areas for one Careers and Jobs", async (role) => {
    const off = await dumpFor(role, "false")
    const on = await dumpFor(role, "true")
    expect(on.pillRow[0]).toBe(`${CAREERS_AND_JOBS_LABEL} -> ${CAREERS_AND_JOBS_PATH}`)
    expect(on.pillRow.filter((l) => l.startsWith(CAREERS_AND_JOBS_LABEL))).toHaveLength(1)
    expect(on.pillRow.some((l) => l.startsWith("My fit") || l.startsWith("Growth areas"))).toBe(false)
    expect(on.pillRow.slice(1)).toEqual(
      off.pillRow.filter((l) => !l.startsWith("My fit") && !l.startsWith("Growth areas")),
    )
  })

  it.each(ROLES)("%s: every sidebar changes only the Career Fit entries", async (role) => {
    const off = await dumpFor(role, "false")
    const on = await dumpFor(role, "true")
    for (const v of VERTICALS) {
      // JF-13 regroups the Tools section under the same switch (Talent
      // Studio); its on state and reachability are pinned in
      // jf13-talent-studio.test.tsx. JF-8 never touches Tools, so it is left
      // out of this comparison rather than restated here.
      const notTools = <S extends { label: string }>(sections: S[]) => sections.filter((s) => s.label !== "Tools")
      const expected = notTools(off.sidebars[v]).map((section) => {
        if (section.label === "My Workspace") {
          return { ...section, items: section.items.map(swapMainEntry) }
        }
        // The Job Fit section: Careers and Jobs first, My fit and Growth areas
        // gone, every other tool as today (greyed Blueprint for `user` included).
        if (v === "job-fit" && section.items.some((l) => l.startsWith("My fit"))) {
          return {
            ...section,
            items: [
              `${CAREERS_AND_JOBS_LABEL} -> ${CAREERS_AND_JOBS_PATH}`,
              ...section.items.filter((l) => !l.startsWith("My fit") && !l.startsWith("Growth areas")),
            ],
          }
        }
        return section
      })
      expect({ v, sections: notTools(on.sidebars[v]) }).toEqual({ v, sections: expected })
    }
    const jobFitItems = on.sidebars["job-fit"].flatMap((s) => s.items)
    expect(jobFitItems.some((l) => l.startsWith("My fit") || l.startsWith("Growth areas"))).toBe(false)
  })

  it("an account not entitled to job-fit still gets no Career Fit / Careers and Jobs entry", async () => {
    mockEntitled = ["career-discovery"]
    const on = await dumpFor("user", "true")
    expect(on.mainMenu.some((l) => l.startsWith("Career Fit") || l.startsWith(CAREERS_AND_JOBS_LABEL))).toBe(false)
    expect(on.mainMenu).toContain("Career & Education Discovery -> /vertical/career-discovery/journey")
  })
})
