/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import { useGatedNavItems } from "../useGatedNavItems"

jest.mock("@/constants/navigation", () => ({
  NAV_ITEMS_BY_ROLE: {
    user: [{ to: "/home", icon: () => null, label: "Home" }],
    practitioner: [
      { to: "/practitioner/home", icon: () => null, label: "Practitioner Home" },
      { to: "/practitioner/meridian-chat", icon: () => null, label: "Chat with Meridian" },
      { to: "/practitioner/clients", icon: () => null, label: "My Clients" },
      { to: "/practitioner/schedule", icon: () => null, label: "Schedule" },
      { to: "/practitioner/analytics", icon: () => null, label: "Analytics" },
    ],
  },
}))

describe("useGatedNavItems", () => {
  it("returns exactly the role's nav items (no entitlement appends)", () => {
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
    expect(result.current.map((i) => i.label)).toEqual(["Home"])
  })
})
