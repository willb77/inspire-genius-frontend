/**
 * @jest-environment jsdom
 *
 * The company-admin menu through useGatedNavItems with the REAL role lists.
 *
 * RM-9a (2026-11-26): the house-style menu is baked into COMPANY_ADMIN_NAV_ITEMS
 * and the render-time swap is gone, so the `company-admin` house switch no
 * longer changes this menu in either direction, and Cohort Read-out is never a
 * row (it is a tab of the Analytics hub, RM-5) — the classic, switch-off menu
 * that carried it was the only place it was one. Until RM-9a this file pinned
 * the swap itself. CSA: docs/analysis/2026-11-26-rm-9-csa.md (monorepo #2237).
 */
import { renderHook } from "@testing-library/react"
import { useGatedNavItems } from "../useGatedNavItems"
import { COMPANY_ADMIN_NAV_ITEMS, NAV_ITEMS_BY_ROLE } from "@/constants/navigation"

jest.mock("@/components/layout/useVerticalLauncher", () => {
  const actual = jest.requireActual("@/components/layout/useVerticalLauncher")
  return { ...actual, useWorkspaceNavItems: (items: unknown) => items }
})
jest.mock("@/hooks/super-admin/usePrismExam", () => ({
  useExamAccess: () => ({ data: undefined }),
}))
const mockCohortEnabled = jest.fn((enabled: boolean) => ({ data: enabled ? true : undefined }))
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: (enabled: boolean) => mockCohortEnabled(enabled),
}))
// RM-6 B: the practitioner client-roster status reads OFF here, so every
// menu below is today's menu (the switch-on menu has its own suite).
jest.mock("@/hooks/switches/usePractitionerClientRosterEnabled", () => ({
  usePractitionerClientRosterEnabled: () => false,
  usePractitionerClientRosterStatus: () => ({ data: false, isLoading: false }),
}))

const SWITCH = "house_style_company-admin"
const labels = (items: { label: string }[]) => items.map((i) => i.label)
const BAKED = ["Dashboard", "People", "Organization", "Reports", "Surveys"]

beforeEach(() => {
  localStorage.clear()
  mockCohortEnabled.mockClear()
})

describe("useGatedNavItems — company-admin menu, house style baked in (RM-9a)", () => {
  it.each([undefined, "true", "false"])("house_style_company-admin = %s: the same five rows", (value) => {
    if (value !== undefined) localStorage.setItem(SWITCH, value)
    const { result } = renderHook(() => useGatedNavItems("company-admin"))
    expect(result.current).toBe(COMPANY_ADMIN_NAV_ITEMS)
    expect(labels(result.current)).toEqual(BAKED)
  })

  it("no Settings, Help or User Management row (RM-4 footer; RM-8 names)", () => {
    const l = labels(renderHook(() => useGatedNavItems("company-admin")).result.current)
    expect(l).not.toContain("Help & Support")
    expect(l).not.toContain("Settings")
    expect(l).not.toContain("User Management")
  })

  it("no Cohort Read-out row even when the org has it, and the menu no longer asks (it is a hub tab)", () => {
    const l = labels(renderHook(() => useGatedNavItems("company-admin")).result.current)
    expect(l).not.toContain("Cohort Read-out")
    expect(mockCohortEnabled).not.toHaveBeenCalled()
  })

  it("flipping the switch and re-rendering changes nothing", () => {
    const { result, rerender } = renderHook(() => useGatedNavItems("company-admin"))
    const before = labels(result.current)
    localStorage.setItem(SWITCH, "false")
    rerender()
    expect(labels(result.current)).toEqual(before)
  })

  it("no other role's menu depends on the switch", () => {
    for (const role of ["manager", "practitioner", "distributor", "user"] as const) {
      localStorage.removeItem(SWITCH)
      const absent = labels(renderHook(() => useGatedNavItems(role)).result.current)
      // RM-9b: the user's list is roleNavItems (toggle-aware), so compare against
      // the menu with the switch absent rather than the static map.
      if (role !== "user") expect(absent).toEqual(labels(NAV_ITEMS_BY_ROLE[role]))
      for (const value of ["true", "false"]) {
        localStorage.setItem(SWITCH, value)
        expect(labels(renderHook(() => useGatedNavItems(role)).result.current)).toEqual(absent)
      }
    }
  })
})
