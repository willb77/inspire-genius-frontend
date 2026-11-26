/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import { useGatedNavItems } from "../useGatedNavItems"

jest.mock("@/constants/navigation", () => ({
  // RM-4: the roles that get a My Workspace section, so their own list is not
  // spliced with workspace verticals (the section carries them).
  WORKSPACE_SECTION_ROLES: new Set(["manager", "company-admin", "practitioner"]),
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

// N-3: the cohort read-out status read. `enabled` is the role check; data is the server's answer.
let mockCohortOn: boolean | undefined
// A disabled React Query still returns CACHED data (e.g. after an account switch).
let mockCohortCached = false
const mockCohortEnabled = jest.fn()
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: (enabled: boolean) => {
    mockCohortEnabled(enabled)
    return { data: enabled || mockCohortCached ? mockCohortOn : undefined }
  },
}))
// RM-6 B: the practitioner client-roster status reads OFF here, so every
// menu below is today's menu (the switch-on menu has its own suite).
jest.mock("@/hooks/switches/usePractitionerClientRosterEnabled", () => ({
  usePractitionerClientRosterEnabled: () => false,
  usePractitionerClientRosterStatus: () => ({ data: false, isLoading: false }),
}))

describe("useGatedNavItems", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWorkspaceNav.mockImplementation((items: unknown) => items)
    mockExamAccess = undefined
    mockCohortOn = undefined
    mockCohortCached = false
  })

  describe("Cohort Read-out item (N-3)", () => {
    it("is added for a company-admin whose org has the switch on", () => {
      mockCohortOn = true
      const { result } = renderHook(() => useGatedNavItems("company-admin"))
      expect(mockCohortEnabled).toHaveBeenCalledWith(true)
      expect(result.current.find((i) => i.label === "Cohort Read-out")?.to).toBe("/company-admin/cohort-readout")
    })

    it("switch off or unanswered: the company-admin menu is unchanged", () => {
      mockCohortOn = false
      const off = renderHook(() => useGatedNavItems("company-admin")).result.current
      mockCohortOn = undefined
      const pending = renderHook(() => useGatedNavItems("company-admin")).result.current
      expect(off.some((i) => i.label === "Cohort Read-out")).toBe(false)
      expect(pending.some((i) => i.label === "Cohort Read-out")).toBe(false)
      expect(off.map((i) => i.label)).toEqual(["Home", "Settings", "Help & Support"])
    })

    it("never asks, and never shows it, for any other role", () => {
      mockCohortOn = true
      const { result } = renderHook(() => useGatedNavItems("practitioner"))
      expect(mockCohortEnabled).toHaveBeenCalledWith(false)
      expect(result.current.some((i) => i.label === "Cohort Read-out")).toBe(false)
    })

    it("ignores a cached true for any other role", () => {
      mockCohortOn = true
      mockCohortCached = true
      const { result } = renderHook(() => useGatedNavItems("practitioner"))
      expect(result.current.some((i) => i.label === "Cohort Read-out")).toBe(false)
    })
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

  it("routes a role with no My Workspace section through useWorkspaceNavItems so workspace verticals land in it", () => {
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

  it("RM-4: a role WITH a My Workspace section keeps workspace verticals out of its own list", () => {
    // They are in the My Workspace section instead; splicing them here too
    // would list Career Fit twice in one sidebar.
    mockWorkspaceNav.mockImplementation((items) => [
      ...(items as Array<{ to: string; icon: () => null; label: string }>),
      { to: "/vertical/job-fit", icon: () => null, label: "Career Fit" },
    ])
    for (const role of ["practitioner", "company-admin"] as const) {
      const { result } = renderHook(() => useGatedNavItems(role))
      expect(result.current.some((i) => i.label === "Career Fit")).toBe(false)
    }
  })
})
