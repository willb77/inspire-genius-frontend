/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import { useGatedNavItems } from "../useGatedNavItems"

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
const mockWorkspaceNav = jest.fn((items: unknown) => items)
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useWorkspaceNavItems: (items: unknown) => mockWorkspaceNav(items),
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
