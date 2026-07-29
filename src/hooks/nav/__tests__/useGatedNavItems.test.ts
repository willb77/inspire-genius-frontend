/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import { useGatedNavItems, useEntitledVerticalItems } from "../useGatedNavItems"

jest.mock("@/constants/navigation", () => ({
  NAV_ITEMS_BY_ROLE: {
    user: [
      { to: "/home", icon: () => null, label: "Home" },
      { to: "/settings", icon: () => null, label: "Settings" },
      { to: "/help", icon: () => null, label: "Help & Support" },
    ],
    practitioner: [
      { to: "/practitioner/home", icon: () => null, label: "Practitioner Home" },
      { to: "/practitioner/meridian-chat", icon: () => null, label: "Chat with Meridian" },
      { to: "/practitioner/clients", icon: () => null, label: "My Clients" },
      { to: "/practitioner/schedule", icon: () => null, label: "Schedule" },
      { to: "/practitioner/analytics", icon: () => null, label: "Analytics" },
    ],
  },
}))

// `useWorkspaceNavItems` (the Job Fit / Lumen splice) is covered in
// `components/layout/__tests__/useVerticalLauncher.test.ts` against the real
// registry; here it is the identity so this suite tests role-menu wiring alone.
const mockLauncher = jest.fn()
const mockWorkspaceNav = jest.fn((items: unknown) => items)
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useVerticalLauncherSection: () => mockLauncher(),
  useWorkspaceNavItems: (items: unknown) => mockWorkspaceNav(items),
}))

const mockBroadcast = jest.fn()
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => mockBroadcast(),
}))

jest.mock("@/constants/sidebar-sections", () => ({
  BROADCAST_SIDEBAR_SECTION: { items: [{ to: "/super-admin/broadcast-alert", icon: () => null, label: "Broadcast Alerts" }] },
}))

describe("useGatedNavItems", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWorkspaceNav.mockImplementation((items: unknown) => items)
  })

  it("returns exactly the role's nav items (no launcher-vertical appends)", () => {
    const { result } = renderHook(() => useGatedNavItems("practitioner"))
    expect(result.current.map((i) => i.label)).toEqual([
      "Practitioner Home",
      "Chat with Meridian",
      "My Clients",
      "Schedule",
      "Analytics",
    ])
  })

  it("falls back to user items for an unknown role", () => {
    const { result } = renderHook(() => useGatedNavItems("nope" as never))
    expect(result.current.map((i) => i.label)).toEqual(["Home", "Settings", "Help & Support"])
  })

  it("routes the role menu through useWorkspaceNavItems so workspace verticals land in it", () => {
    mockWorkspaceNav.mockImplementation((items) => [
      ...(items as Array<{ to: string; icon: () => null; label: string }>),
      { to: "/vertical/lumen/dashboard", icon: () => null, label: "Lumen" },
    ])
    const { result } = renderHook(() => useGatedNavItems("user"))
    expect(mockWorkspaceNav).toHaveBeenCalled()
    expect(result.current.map((i) => i.label)).toEqual([
      "Home",
      "Settings",
      "Help & Support",
      "Lumen",
    ])
  })
})

describe("useEntitledVerticalItems", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLauncher.mockReturnValue(null)
    mockBroadcast.mockReturnValue({ data: { authorized: false } })
  })

  it("returns [] when the registry produced no section", () => {
    const { result } = renderHook(() => useEntitledVerticalItems("practitioner"))
    expect(result.current).toEqual([])
  })

  it("passes the launcher catalogue straight through, disabled flags intact", () => {
    // GRANT + KCE are no longer synthesized here: they are ordinary registry
    // entries in the launcher section, so this hook must not double-add them.
    mockLauncher.mockReturnValue({
      items: [
        { to: "/vertical/grant/dashboard", icon: () => null, label: "GRANT", disabled: false },
        { to: "/vertical/honor", icon: () => null, label: "Honor Foundation", disabled: true },
      ],
    })
    const { result } = renderHook(() => useEntitledVerticalItems("practitioner"))
    expect(result.current.map((i) => [i.label, i.disabled])).toEqual([
      ["GRANT", false],
      ["Honor Foundation", true],
    ])
  })

  it("appends Platform Alerts only for an allow-listed super-admin", () => {
    mockLauncher.mockReturnValue({
      items: [{ to: "/vertical/honor", icon: () => null, label: "Honor Foundation" }],
    })
    mockBroadcast.mockReturnValue({ data: { authorized: true } })
    const { result } = renderHook(() => useEntitledVerticalItems("super-admin"))
    expect(result.current.map((i) => i.label)).toEqual([
      "Honor Foundation",
      "Broadcast Alerts",
    ])
  })
})
