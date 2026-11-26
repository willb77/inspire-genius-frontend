/**
 * @jest-environment jsdom
 *
 * RM-9a (2026-11-26) — the menus people see on dev and staging-b do not change.
 * CSA: docs/analysis/2026-11-26-rm-9-csa.md (monorepo #2237).
 *
 * Both tiers build with every house-style area on (`DEV_HOUSE_STYLE_AREAS` and
 * `STAGING_B_HOUSE_STYLE_AREAS`, read from the deployed bundles on 2026-11-26),
 * so this suite sets the same build list and pins, for all six roles:
 *   1. the role sidebar through the REAL UnifiedLayout (role menus, the
 *      company-admin house menu, workspace splice, Tools, footer);
 *   2. the sidebar of a `/vertical/*` page (useVerticalPageSections), which is
 *      where `withCompanyAdminHouseMenu` was applied;
 *   3. Lumen's no-access page, the other place it was applied;
 *   4. the sidebar the three pages that chose their own chrome — Goals Studio,
 *      My development and Role Practice — actually render, through the REAL
 *      UserLayout / UnifiedLayout.
 * The snapshots were written on the code before RM-9a and must not change.
 *
 * Only the server reads, the page-view audit and SidebarScaffold itself are
 * stubbed; SidebarScaffold records the menu it was handed. `expandOnPath` is
 * left out of the snapshot on purpose and asserted separately: it changes
 * nothing on screen, only whether clicking Home reopens a collapsed rail.
 */
import { render, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import type { ReactNode } from "react"
import "@/verticals"
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"

/** Both tiers' build list (repository variables; the deployed bundles carry the same literal). */
const TIER_AREAS =
  "admin,distributor,company-admin,practitioner,manager,programs,workspace,team-development,goals,career-education,interview,resume"

let mockRole: string | undefined = "user"
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Invented Person", email: "invented.person@example.test", role: mockRole } }),
}))
jest.mock("@/hooks/job-fit/useSavedJobs", () => ({
  ...jest.requireActual("@/hooks/job-fit/useSavedJobs"),
  useSavedJobsEnabled: () => false,
}))
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => ({ data: ["job-fit", "career-discovery"], isLoading: false }),
}))
jest.mock("@/hooks/super-admin/usePrismExam", () => ({ useExamAccess: () => ({ data: undefined }) }))
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: () => ({ data: true }),
}))
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => false,
}))
jest.mock("@/hooks/super-admin/useBroadcast", () => ({ useBroadcastAccess: () => ({ data: { authorized: false } }) }))
jest.mock("@/hooks/audit/usePageViewAudit", () => ({ usePageViewAudit: jest.fn() }))
const mockSidebarScaffold = jest.fn()
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: { children?: ReactNode }) => {
    mockSidebarScaffold(props)
    return <>{props.children}</>
  },
}))

// Page content the chrome does not depend on.
jest.mock("@/hooks/summit/useGoalSession", () => ({
  useGoalSession: () => ({ data: { goals: [] } }),
  useSummitCategories: () => [],
}))
const emptyQuery = { data: [], isLoading: false, isError: false, error: null, refetch: jest.fn() }
const idleMutation = { mutate: jest.fn(), isPending: false, error: null, variables: undefined }
jest.mock("@/hooks/me/useMyDevelopment", () => ({
  useMyGaps: () => emptyQuery,
  useCreateMyGap: () => idleMutation,
  useCloseMyGap: () => idleMutation,
  useMyLearningItems: () => emptyQuery,
  useCreateMyLearningItem: () => idleMutation,
  useUpdateMyLearningItem: () => idleMutation,
  useMyMilestones: () => emptyQuery,
  useMyFullPrism: () => ({ ...emptyQuery, data: null }),
}))
jest.mock("@/hooks/summit/useMyGoals", () => ({
  ...jest.requireActual("@/hooks/summit/useMyGoals"),
  useMyGoalReviews: () => ({ ...emptyQuery, data: { memberId: "m1", reviews: [] } }),
}))
jest.mock("@/pages/lumen/LumenRequestAccess", () => ({ __esModule: true, default: () => <p>request access</p> }))

import UnifiedLayout from "@/layouts/UnifiedLayout"
import GoalsStudioLayout from "@/pages/summit/GoalsStudioLayout"
import MyDevelopment from "@/pages/user/MyDevelopment"
import RolePracticeChrome from "@/components/interview/house/RolePracticeChrome"
import LumenLayout from "@/pages/lumen/LumenLayout"
import { useVerticalPageSections } from "../useVerticalPageSections"
import { ROUTES } from "@/constants/routes"

const ROLES: UserRole[] = ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"]

type ScaffoldProps = {
  navItems?: NavItemDef[]
  navSections?: NavSectionDef[]
  expandOnPath?: string
  collapseOnMount?: boolean
  className?: string
}

const rows = (items: NavItemDef[] = []): unknown[] =>
  items.map((i) => {
    const row = `${i.label} -> ${i.to}${i.disabled ? " (greyed)" : ""}`
    return i.children?.length ? { [row]: rows(i.children) } : row
  })

const sections = (list: NavSectionDef[] = []) =>
  list.map((s) => ({
    section: s.label,
    ...(s.pinned ? { pinned: true } : {}),
    ...(s.defaultCollapsed ? { collapsed: true } : {}),
    ...(s.collapsible ? { collapsible: true } : {}),
    items: rows(s.items),
  }))

/** What the person sees in the sidebar: no `expandOnPath` (see the header). */
function seen(p: ScaffoldProps) {
  return {
    items: rows(p.navItems),
    sections: p.navSections ? sections(p.navSections) : null,
    collapseOnMount: p.collapseOnMount ?? false,
  }
}

function wrap(ui: ReactNode, path = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

function lastScaffold(): ScaffoldProps {
  expect(mockSidebarScaffold).toHaveBeenCalled()
  return mockSidebarScaffold.mock.calls.at(-1)![0] as ScaffoldProps
}

const savedEnv = process.env.VITE_HOUSE_STYLE_AREAS
beforeAll(() => {
  process.env.VITE_HOUSE_STYLE_AREAS = TIER_AREAS
})
afterAll(() => {
  if (savedEnv === undefined) delete process.env.VITE_HOUSE_STYLE_AREAS
  else process.env.VITE_HOUSE_STYLE_AREAS = savedEnv
})
beforeEach(() => {
  localStorage.clear()
  mockSidebarScaffold.mockClear()
})

it("covers all six roles (a walker over nothing proves nothing)", () => {
  expect(ROLES).toHaveLength(6)
})

describe("1. role sidebar through UnifiedLayout, tier build", () => {
  test.each(ROLES)("%s", (role) => {
    mockRole = role
    render(wrap(<UnifiedLayout role={role}><div /></UnifiedLayout>))
    expect(seen(lastScaffold())).toMatchSnapshot()
  })
})

describe("2. a /vertical/* page sidebar, tier build", () => {
  test.each(ROLES)("%s", (role) => {
    mockRole = role
    const { result } = renderHook(() => useVerticalPageSections("job-fit", role), {
      wrapper: ({ children }) => wrap(children, "/vertical/job-fit/home"),
    })
    expect(sections(result.current)).toMatchSnapshot()
  })
})

describe("3. Lumen's no-access page, tier build", () => {
  test.each(ROLES)("%s", (role) => {
    mockRole = role
    render(wrap(<LumenLayout />, "/vertical/lumen"))
    expect(seen(lastScaffold())).toMatchSnapshot()
  })
})

describe("4. the three pages that chose their own chrome, tier build", () => {
  const PAGES: Array<[string, () => ReactNode, string]> = [
    [
      "Goals Studio",
      () => (
        <Routes>
          <Route path="/my/goals" element={<GoalsStudioLayout />}>
            <Route index element={<div />} />
          </Route>
        </Routes>
      ),
      "/my/goals",
    ],
    ["My development", () => <MyDevelopment />, ROUTES.MY_DEVELOPMENT],
    ["Role Practice", () => <RolePracticeChrome><div /></RolePracticeChrome>, "/interview-practice"],
  ]

  describe.each(PAGES)("%s", (_name, page, path) => {
    test.each(ROLES)("%s", (role) => {
      mockRole = role
      render(wrap(page(), path))
      expect(seen(lastScaffold())).toMatchSnapshot()
    })

    test("a role outside the six renders the user chrome (no crash, no role menu)", () => {
      mockRole = "not-a-role"
      render(wrap(page(), path))
      const p = lastScaffold()
      expect(rows(p.navItems).length + (p.navSections?.length ?? 0)).toBeGreaterThan(0)
    })
  })
})
