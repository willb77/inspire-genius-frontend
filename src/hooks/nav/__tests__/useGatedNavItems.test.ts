/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import { useGatedNavItems } from "../useGatedNavItems"

jest.mock("@/constants/navigation", () => ({
  NAV_ITEMS_BY_ROLE: {
    user: [{ to: "/home", icon: () => null, label: "Home" }],
    practitioner: [
      { to: "/practitioner/home", icon: () => null, label: "Home" },
      { to: "/practitioner/clients", icon: () => null, label: "My Clients" },
    ],
  },
}))

const mockUseVerticalAccess = jest.fn()
jest.mock("@/verticals/core", () => ({
  useVerticalAccess: (v: string) => mockUseVerticalAccess(v),
}))

const mockLauncher = jest.fn()
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useVerticalLauncherSection: () => mockLauncher(),
}))

const mockBroadcast = jest.fn()
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => mockBroadcast(),
}))

jest.mock("@/constants/sidebar-sections", () => ({
  grantSidebarSectionForRole: () => ({ items: [{ to: "/vertical/grant", icon: () => null, label: "Grant" }] }),
  KCE_SIDEBAR_SECTION: { items: [{ to: "/kce", icon: () => null, label: "KCE" }] },
  BROADCAST_SIDEBAR_SECTION: { items: [{ to: "/broadcast", icon: () => null, label: "Broadcast" }] },
}))

describe("useGatedNavItems", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseVerticalAccess.mockReturnValue({ hasAccess: false })
    mockLauncher.mockReturnValue(null)
    mockBroadcast.mockReturnValue({ data: { authorized: false } })
  })

  it("returns the role's base items when nothing is entitled", () => {
    const { result } = renderHook(() => useGatedNavItems("practitioner"))
    expect(result.current.map((i) => i.label)).toEqual(["Home", "My Clients"])
  })

  it("appends grant + KCE + broadcast items when entitled", () => {
    mockUseVerticalAccess.mockReturnValue({ hasAccess: true })
    mockBroadcast.mockReturnValue({ data: { authorized: true } })
    const { result } = renderHook(() => useGatedNavItems("practitioner"))
    const labels = result.current.map((i) => i.label)
    expect(labels).toContain("Grant")
    expect(labels).toContain("KCE")
    expect(labels).toContain("Broadcast")
  })

  it("appends the vertical launcher section when present", () => {
    mockLauncher.mockReturnValue({ items: [{ to: "/honor", icon: () => null, label: "Honor" }] })
    const { result } = renderHook(() => useGatedNavItems("practitioner"))
    expect(result.current.map((i) => i.label)).toContain("Honor")
  })

  it("falls back to user items for an unknown role", () => {
    const { result } = renderHook(() => useGatedNavItems("nope" as never))
    expect(result.current.map((i) => i.label)).toEqual(["Home"])
  })
})
