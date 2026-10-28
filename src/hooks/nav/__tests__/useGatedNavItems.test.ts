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
  // The real splice puts extras above the Settings/Help tail; appending is enough here.
  withWorkspaceVerticals: (items: unknown[], extra: unknown[]) => [...items, ...extra],
}))

// The PRISM exam grant read (2026-10-27). `enabled` is the role check; data is the server's answer.
let mockExamAccess: { allowed: boolean; super_admin: boolean } | undefined
const mockExamEnabled = jest.fn()
jest.mock("@/hooks/super-admin/usePrismExam", () => ({
  useExamAccess: (enabled: boolean) => {
    mockExamEnabled(enabled)
    return { data: enabled ? mockExamAccess : undefined }
  },
}))

describe("useGatedNavItems", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWorkspaceNav.mockImplementation((items: unknown) => items)
    mockExamAccess = undefined
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

  describe("PRISM Exam item", () => {
    it("is added for a grantable role the server says is granted", () => {
      mockExamAccess = { allowed: true, super_admin: false }
      const { result } = renderHook(() => useGatedNavItems("practitioner"))
      expect(mockExamEnabled).toHaveBeenCalledWith(true)
      const item = result.current.find((i) => i.label === "PRISM Exam")
      expect(item?.to).toBe("/prism-exam")
    })

    it("is absent when the server says no, or before it answers", () => {
      mockExamAccess = { allowed: false, super_admin: false }
      expect(renderHook(() => useGatedNavItems("practitioner")).result.current.some((i) => i.label === "PRISM Exam")).toBe(false)
      mockExamAccess = undefined
      expect(renderHook(() => useGatedNavItems("practitioner")).result.current.some((i) => i.label === "PRISM Exam")).toBe(false)
    })

    it("never asks for a plain user, who cannot be granted", () => {
      mockExamAccess = { allowed: true, super_admin: false }
      const { result } = renderHook(() => useGatedNavItems("user"))
      expect(mockExamEnabled).toHaveBeenCalledWith(false)
      expect(result.current.some((i) => i.label === "PRISM Exam")).toBe(false)
    })
  })
})

