/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"

const DummyIcon = () => null

// JF-8 menu wiring: the menus now read `job_fit_v2` (JF-7's status read). Off
// here, as today; the on state is covered in jf8-menu-wiring.test.tsx.
jest.mock("@/hooks/job-fit/useSavedJobs", () => ({
  ...jest.requireActual("@/hooks/job-fit/useSavedJobs"),
  useSavedJobsEnabled: () => false,
}))
jest.mock("@/constants/navigation", () => ({
  MY_WORKSPACE_SECTION_LABEL: "My Workspace",
  NAV_ITEMS_BY_ROLE: {
    user: [{ to: "/home", icon: DummyIcon, label: "Home" }],
    manager: [{ to: "/manager/dashboard", icon: DummyIcon, label: "Manager Dashboard" }],
    "super-admin": [{ to: "/super-admin/dashboard", icon: DummyIcon, label: "Admin Dashboard" }],
  },
  getUserNavItems: () => [
    { to: "/home", icon: DummyIcon, label: "Home" },
    { to: "/settings", icon: DummyIcon, label: "Settings" },
  ],
  // RM-9b (D-2): the user's list comes through roleNavItems (getUserNavItems).
  roleNavItems: (role: string) =>
    role === "manager"
      ? [{ to: "/manager/dashboard", icon: DummyIcon, label: "Manager Dashboard" }]
      : [
          { to: "/home", icon: DummyIcon, label: "Home" },
          { to: "/settings", icon: DummyIcon, label: "Settings" },
        ],
}))

// RM-9b (D-1): a super-admin's vertical page is the super-admin menu from
// useSuperAdminSections, with the vertical passed in `beforeTools`. Its own
// gates (owner-only rows, house groups) are that hook's, tested there.
const mockSuperAdminSections = jest.fn()
jest.mock("@/hooks/nav/useSuperAdminSections", () => ({
  useSuperAdminSections: (options: unknown) => mockSuperAdminSections(options),
}))

const mockSubNav = jest.fn()
jest.mock("@/constants/vertical-subnav", () => ({
  verticalSubNavItems: (v: string, r: string) => mockSubNav(v, r),
}))

const mockLauncher = jest.fn()
const mockWorkspaceNav = jest.fn((items: unknown) => items)
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useWorkspaceNavItems: (items: unknown) => mockWorkspaceNav(items),
}))

// The Tools section is super-admin only as of 2026-08-12; `mockLauncher` stands
// in for it. The role gate lives in the real hook (covered in
// useToolsSection.test.ts), so tests that exercise the plain-user case set it to
// null explicitly rather than relying on this mock to enforce the gate.
jest.mock("@/hooks/nav/useToolsSection", () => ({
  TOOLS_SECTION_LABEL: "Tools",
  useToolsSection: () => mockLauncher(),
}))

// RM-4: the role menu frame. By default a role outside the frame (footer null),
// so the cases below keep testing the user / super-admin structure; the
// framed cases set a footer. `frameSections` is the real one.
const mockFooter = jest.fn((): unknown[] | null => null)
jest.mock("@/hooks/nav/useGatedNavItems", () => ({
  frameSections: jest.requireActual("@/hooks/nav/useGatedNavItems").frameSections,
  useRoleMenuFrame: () => ({
    own: [{ to: "/manager/development", icon: () => null, label: "Team Development Studio" }],
    workspace: mockFooter() ? [{ to: "/my/goals", icon: () => null, label: "Goals Studio" }] : null,
    tools: mockLauncher(),
    footer: mockFooter(),
  }),
}))

jest.mock("@/lib/agentApi", () => ({ useAgentEngine: () => true }))
// JF-11: whether Discovery folds Who I am into the profile entry (a cache read).
const mockMerged = jest.fn(() => false)
jest.mock("@/hooks/career-discovery/useProfileMerged", () => ({ useProfileMerged: () => mockMerged() }))
jest.mock("@/verticals/core", () => ({
  getVertical: (key: string) => ({ key, title: key === "lumen" ? "Lumen" : key }),
}))

import { useVerticalPageSections } from "../useVerticalPageSections"

const LAUNCHER = {
  label: "Tools",
  defaultCollapsed: true,
  items: [
    { to: "/vertical/grant/dashboard", icon: DummyIcon, label: "GRANT" },
    { to: "/vertical/lumen/dashboard", icon: DummyIcon, label: "Lumen" },
  ],
}

describe("useVerticalPageSections", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFooter.mockReturnValue(null)
    mockSuperAdminSections.mockImplementation((options: { beforeTools?: unknown[] }) => [
      { label: "People", items: [] },
      { label: "Advanced", items: [] },
      ...(options.beforeTools ?? []),
      LAUNCHER,
      { label: "My Workspace", items: [] },
      { label: "", items: [], pinned: true },
    ])
    mockWorkspaceNav.mockImplementation((items: unknown) => items)
    mockLauncher.mockReturnValue(LAUNCHER)
    mockSubNav.mockReturnValue({
      items: [{ to: "/vertical/lumen/moments", icon: DummyIcon, label: "Moments" }],
    })
  })

  it("gives a plain user My Workspace → vertical only — no Tools section", () => {
    // Tools is super-admin only since 2026-08-12, so a plain user inside a
    // vertical keeps their workspace menu and that vertical's own sub-nav, and
    // nothing else.
    mockLauncher.mockReturnValue(null)
    const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "user"))
    expect(result.current.map((s) => s.label)).toEqual(["My Workspace", "Lumen"])
  })

  it("places Tools after the vertical when the role does get one", () => {
    const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "user"))
    expect(result.current.map((s) => s.label)).toEqual(["My Workspace", "Lumen", "Tools"])
  })

  it("rolls up everything EXCEPT My Workspace and the vertical you entered", () => {
    const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "user"))
    const byLabel = Object.fromEntries(
      result.current.map((s) => [s.label, { closed: s.defaultCollapsed, open: s.collapsible }]),
    )
    // Always visible since 2026-10-12: a plain group, no header toggle.
    expect(byLabel["My Workspace"].closed).toBeUndefined()
    expect(byLabel["My Workspace"].open).toBeUndefined()
    // Tools carries its own collapse default rather than one forced here, so it
    // does not expand and collapse as you move between vertical pages and the
    // rest of the app.
    expect(byLabel["Tools"].closed).toBe(true)
    // The vertical is collapsible but starts OPEN — the whole point.
    expect(byLabel["Lumen"].closed).toBeUndefined()
    expect(byLabel["Lumen"].open).toBe(true)
  })

  it("RM-9b (D-1): a super-admin gets the house super-admin menu with the vertical directly before Tools", () => {
    const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "super-admin"))
    expect(result.current.map((s) => s.label)).toEqual(["People", "Advanced", "Lumen", "Tools", "My Workspace", ""])
    expect(mockSuperAdminSections).toHaveBeenLastCalledWith(
      expect.objectContaining({ workspaceExpanded: true, beforeTools: [expect.objectContaining({ label: "Lumen" })] }),
    )
    // No classic sections on any vertical page.
    const labels = result.current.map((s) => s.label)
    expect(labels).not.toContain("Role Views")
    expect(labels).not.toContain("Administration")
  })

  it("RM-9b (D-1): the super-admin's Tools still marks the vertical you are in as active", () => {
    const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "super-admin"))
    const tools = result.current.find((s) => s.label === "Tools")
    expect(tools?.items.find((i) => i.label === "Lumen")?.activePrefix).toBe("/vertical/lumen")
    expect(tools?.items.find((i) => i.label === "GRANT")?.activePrefix).toBeUndefined()
  })

  it("RM-9b: no other role's vertical page is built from the super-admin menu", () => {
    for (const role of ["user", "manager"] as const) {
      const { result } = renderHook(() => useVerticalPageSections("lumen" as never, role))
      expect(result.current.map((s) => s.label)).not.toContain("People")
    }
  })

  it("marks the vertical you are in as active for every page beneath it", () => {
    // Without this the launcher entry stops looking active as soon as you move
    // off the vertical's home page — it links to homePath, not the current URL.
    const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "user"))
    const verticals = result.current.find((s) => s.label === "Tools")
    const lumen = verticals?.items.find((i) => i.label === "Lumen")
    const grant = verticals?.items.find((i) => i.label === "GRANT")
    expect(lumen?.activePrefix).toBe("/vertical/lumen")
    expect(grant?.activePrefix).toBeUndefined()
  })

  it("omits the vertical's section entirely when Core has no menu for it", () => {
    mockSubNav.mockReturnValue(null)
    const { result } = renderHook(() => useVerticalPageSections("honor" as never, "user"))
    expect(result.current.map((s) => s.label)).toEqual(["My Workspace", "Tools"])
  })

  it("prefers the vertical's own section label over the registry title", () => {
    mockSubNav.mockReturnValue({
      label: "Financial Aid",
      items: [{ to: "/vertical/grant/profile", icon: DummyIcon, label: "Financial Profile" }],
    })
    const { result } = renderHook(() => useVerticalPageSections("grant" as never, "user"))
    expect(result.current.map((s) => s.label)).toContain("Financial Aid")
  })

  describe("JF-11: Career Discovery's one profile entry", () => {
    const DISCOVERY = {
      items: [
        { to: "/vertical/career-discovery/journey", icon: DummyIcon, label: "My journey" },
        { to: "/vertical/career-discovery/about", icon: DummyIcon, label: "About me" },
        { to: "/vertical/career-discovery/who", icon: DummyIcon, label: "Who I am" },
        { to: "/vertical/career-discovery/careers", icon: DummyIcon, label: "Career areas" },
      ],
    }
    const section = (r: ReturnType<typeof useVerticalPageSections>) =>
      r.find((s) => s.label === "career-discovery")?.items.map((i) => i.label)

    it("is today's menu, entry for entry, when the server does not fold Who I am", () => {
      mockSubNav.mockReturnValue(DISCOVERY)
      mockMerged.mockReturnValue(false)
      const { result } = renderHook(() => useVerticalPageSections("career-discovery" as never, "user"))
      expect(section(result.current)).toEqual(["My journey", "About me", "Who I am", "Career areas"])
    })

    it("is one My profile entry when it does", () => {
      mockSubNav.mockReturnValue(DISCOVERY)
      mockMerged.mockReturnValue(true)
      const { result } = renderHook(() => useVerticalPageSections("career-discovery" as never, "user"))
      expect(section(result.current)).toEqual(["My journey", "My profile", "Career areas"])
    })

    it("never touches another vertical's menu", () => {
      mockSubNav.mockReturnValue({
        items: [
          { to: "/vertical/direction-setting/portrait", icon: DummyIcon, label: "Who I am" },
          { to: "/vertical/career-discovery/who", icon: DummyIcon, label: "Who I am" },
        ],
      })
      mockMerged.mockReturnValue(true)
      const { result } = renderHook(() => useVerticalPageSections("direction-setting" as never, "user"))
      expect(result.current.find((s) => s.label === "direction-setting")?.items).toHaveLength(2)
    })
  })

  describe("RM-4: a framed role (manager, company admin, practitioner, distributor)", () => {
    const FOOTER = [
      { to: "/manager/settings", icon: DummyIcon, label: "Settings" },
      { to: "/help", icon: DummyIcon, label: "Help & Support" },
    ]
    beforeEach(() => mockFooter.mockReturnValue(FOOTER))

    it("gets the same frame as every other page, with the vertical between My Workspace and Tools", () => {
      const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "manager"))
      expect(result.current.map((s) => s.label)).toEqual(["", "My Workspace", "Lumen", "Tools", ""])
      expect(result.current[0].items.map((i) => i.label)).toEqual(["Team Development Studio"])
      expect(result.current.at(-1)!.items).toBe(FOOTER)
    })

    it("keeps My Workspace a visible plain group and marks the vertical active in Tools", () => {
      const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "manager"))
      const ws = result.current.find((s) => s.label === "My Workspace")!
      expect(ws.defaultCollapsed).toBeUndefined()
      expect(ws.collapsible).toBeUndefined()
      const lumen = result.current.find((s) => s.label === "Tools")!.items.find((i) => i.label === "Lumen")
      expect(lumen?.activePrefix).toBe("/vertical/lumen")
    })

    it("has no Role Views or Administration, which are super-admin only", () => {
      const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "manager"))
      const labels = result.current.map((s) => s.label)
      expect(labels).not.toContain("Role Views")
      expect(labels).not.toContain("Administration")
    })
  })
})
