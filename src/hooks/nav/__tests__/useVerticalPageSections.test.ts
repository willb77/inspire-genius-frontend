/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"

const DummyIcon = () => null

jest.mock("@/constants/navigation", () => ({
  NAV_ITEMS_BY_ROLE: {
    user: [{ to: "/home", icon: DummyIcon, label: "Home" }],
    manager: [{ to: "/manager/dashboard", icon: DummyIcon, label: "Manager Dashboard" }],
    "super-admin": [{ to: "/super-admin/dashboard", icon: DummyIcon, label: "Admin Dashboard" }],
  },
  getUserNavItems: () => [
    { to: "/home", icon: DummyIcon, label: "Home" },
    { to: "/settings", icon: DummyIcon, label: "Settings" },
  ],
  SUPER_ADMIN_NAV_SECTIONS: [
    {
      label: "Administration",
      items: [
        { to: "/super-admin/dashboard", icon: DummyIcon, label: "Dashboard" },
        { to: "/super-admin/dev-traffic-report", icon: DummyIcon, label: "Dev Traffic Report" },
      ],
    },
    { label: "Role Views", items: [{ to: "/home", icon: DummyIcon, label: "User Home" }] },
  ],
  OWNER_ONLY_NAV_ROUTES: new Set(["/super-admin/dev-traffic-report"]),
  isPlatformOwner: (email?: string | null) => email === "willb77@3pp.com",
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
  useToolsSection: () => mockLauncher(),
}))

let mockEmail: string | null = "someone@example.com"
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { email: mockEmail } }),
}))
jest.mock("@/lib/agentApi", () => ({ useAgentEngine: () => true }))
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
    mockEmail = "someone@example.com"
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

  it("rolls up everything EXCEPT the vertical you entered", () => {
    const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "user"))
    const byLabel = Object.fromEntries(
      result.current.map((s) => [s.label, { closed: s.defaultCollapsed, open: s.collapsible }]),
    )
    expect(byLabel["My Workspace"].closed).toBe(true)
    // Tools carries its own collapse default rather than one forced here, so it
    // does not expand and collapse as you move between vertical pages and the
    // rest of the app.
    expect(byLabel["Tools"].closed).toBe(true)
    // The vertical is collapsible but starts OPEN — the whole point.
    expect(byLabel["Lumen"].closed).toBeUndefined()
    expect(byLabel["Lumen"].open).toBe(true)
  })

  it("puts Role Views and Administration around it for a super-admin, Administration last", () => {
    const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "super-admin"))
    expect(result.current.map((s) => s.label)).toEqual([
      "My Workspace",
      "Role Views",
      "Lumen",
      "Tools",
      "Administration",
    ])
    expect(result.current.at(-1)?.defaultCollapsed).toBe(true)
  })

  it("still hides the owner-only route from a non-owner super-admin", () => {
    const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "super-admin"))
    const admin = result.current.find((s) => s.label === "Administration")
    expect(admin?.items.some((i) => i.label === "Dev Traffic Report")).toBe(false)
  })

  it("shows it to the platform owner", () => {
    mockEmail = "willb77@3pp.com"
    const { result } = renderHook(() => useVerticalPageSections("lumen" as never, "super-admin"))
    const admin = result.current.find((s) => s.label === "Administration")
    expect(admin?.items.some((i) => i.label === "Dev Traffic Report")).toBe(true)
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
})
