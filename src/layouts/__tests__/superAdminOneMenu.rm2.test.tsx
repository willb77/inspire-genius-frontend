/**
 * @jest-environment jsdom
 *
 * RM-2 — a super-admin sees ONE menu: on a user page (UserLayout) and on an
 * admin page (SuperAdminLayout) the sidebar comes from useSuperAdminSections,
 * with the owner-only filter applied on both. The single intended difference:
 * on user pages My Workspace is always open (decision of 2026-10-12); house
 * style keeps it collapsed on admin pages.
 *
 * Real navigation constants, real house menu, real owner check. Only the data
 * hooks (Tools, workspace verticals, job_fit_v2) are stubbed.
 */
import { render } from "@testing-library/react"
import type { ReactNode } from "react"
import UserLayout from "../UserLayout"
import SuperAdminLayout from "../SuperAdminLayout"
import { OWNER_ONLY_NAV_ROUTES, PLATFORM_OWNER_EMAIL } from "@/constants/navigation"
import { VIEW_AS_OPTIONS } from "@/constants/house/superAdminNav"
import { ROUTES } from "@/constants/routes"
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"

// Reserved example domain (RFC 2606), built at runtime.
const mockMail = (user: string) => `${user}@example.org`

const mockToolsSection = { label: "Tools", defaultCollapsed: true, items: [{ to: "/bio", label: "Bio Capture" }] }
jest.mock("@/hooks/nav/useToolsSection", () => ({ useToolsSection: () => mockToolsSection }))
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useWorkspaceNavItems: (items: unknown) => items,
}))
jest.mock("@/lib/agentApi", () => ({ useAgentEngine: () => true }))
let mockJobFitV2 = false
jest.mock("@/hooks/job-fit/useSavedJobs", () => ({ useSavedJobsEnabled: () => mockJobFitV2 }))

let mockEmail: string | null = mockMail("staff")
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { role: "super-admin", email: mockEmail } }),
}))

const mockScaffold = jest.fn()
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: { navSections?: NavSectionDef[]; children?: ReactNode }) => {
    mockScaffold(props)
    return <div>{props.children}</div>
  },
}))

function sectionsOf(layout: "user" | "admin"): NavSectionDef[] {
  mockScaffold.mockClear()
  const { unmount } = render(
    layout === "user" ? <UserLayout>page</UserLayout> : <SuperAdminLayout>page</SuperAdminLayout>,
  )
  const sections = mockScaffold.mock.calls[mockScaffold.mock.calls.length - 1][0].navSections as NavSectionDef[]
  unmount()
  return sections
}

function routes(sections: NavSectionDef[]): string[] {
  const walk = (items: NavItemDef[]): string[] => items.flatMap((i) => [i.to, ...walk(i.children ?? [])])
  return sections.flatMap((s) => walk(s.items))
}

/** The admin-page menu with My Workspace forced open — what user pages must show. */
function withWorkspaceOpen(sections: NavSectionDef[]): NavSectionDef[] {
  return sections.map((s) => {
    if (s.label !== "My Workspace") return s
    const open: NavSectionDef = { ...s }
    delete open.defaultCollapsed
    return open
  })
}

const WHO = { owner: PLATFORM_OWNER_EMAIL, other: mockMail("staff") } as const
const CASES = (["owner", "other"] as const).flatMap((who) =>
  [false, true].flatMap((house) => [false, true].map((jobFitV2) => ({ who, house, jobFitV2 }))),
)

function setCase({ who, house, jobFitV2 }: (typeof CASES)[number]) {
  mockEmail = WHO[who]
  mockJobFitV2 = jobFitV2
  if (house) localStorage.setItem("house_style_admin", "true")
  else localStorage.setItem("house_style_admin", "false")
}

afterEach(() => localStorage.clear())

describe("RM-2 — one super-admin menu on user pages and admin pages", () => {
  it.each(CASES)("%p: user-page menu equals the admin-page menu, My Workspace open", (c) => {
    setCase(c)
    const onUserPage = sectionsOf("user")
    const onAdminPage = sectionsOf("admin")
    expect(onUserPage).toEqual(withWorkspaceOpen(onAdminPage))
  })

  it.each(CASES)("%p: Dev Traffic Report is the owner's alone, on both layouts", (c) => {
    setCase(c)
    for (const layout of ["user", "admin"] as const) {
      const reached = routes(sectionsOf(layout))
      for (const r of OWNER_ONLY_NAV_ROUTES) {
        if (c.who === "owner") expect(reached).toContain(r)
        else expect(reached).not.toContain(r)
      }
    }
  })

  it("My Workspace is always open on user pages, and admin pages are unchanged", () => {
    for (const house of [false, true]) {
      setCase({ who: "other", house, jobFitV2: false })
      const user = sectionsOf("user").find((s) => s.label === "My Workspace")
      expect(user?.defaultCollapsed).toBeUndefined()
      expect(user?.collapsible).toBeUndefined()
      const admin = sectionsOf("admin").find((s) => s.label === "My Workspace")
      // Admin pages: collapsed. RM-9b: the house menu is the only menu, so the
      // switch no longer gives the classic open group.
      expect(admin?.defaultCollapsed).toBe(true)
    }
  })

  it("house style ON: no Role Views; every View-as destination is in the menu or behind Admin home", () => {
    setCase({ who: "other", house: true, jobFitV2: false })
    const sections = sectionsOf("user")
    expect(sections.map((s) => s.label)).not.toContain("Role Views")
    const reached = routes(sections)
    // The switcher lives on Admin home; the menu must link to it.
    expect(reached).toContain(ROUTES.SUPER_ADMIN.DASHBOARD)
    // User Home stays a sidebar row (My Workspace › Home).
    expect(reached).toContain(ROUTES.HOME)
    expect(VIEW_AS_OPTIONS).toHaveLength(5)
  })

  // RM-9b (2026-11-26): the classic menu is gone, so house_style_admin=false no
  // longer brings Role Views back — the switch changes nothing.
  it("house style OFF: the same menu as ON — no Role Views", () => {
    setCase({ who: "other", house: false, jobFitV2: false })
    const off = sectionsOf("user")
    setCase({ who: "other", house: true, jobFitV2: false })
    expect(off).toEqual(sectionsOf("user"))
    expect(off.map((s) => s.label)).not.toContain("Role Views")
  })
})
