/**
 * @jest-environment jsdom
 *
 * The company-admin menu through useGatedNavItems with the REAL role lists:
 * the `company-admin` house-style switch (default OFF) swaps the menu at
 * render time, and the Cohort Read-out item still splices in either way.
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
let mockCohortOn: boolean | undefined
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: (enabled: boolean) => ({ data: enabled ? mockCohortOn : undefined }),
}))

const SWITCH = "house_style_company-admin"
const labels = (items: { label: string }[]) => items.map((i) => i.label)

beforeEach(() => {
  localStorage.clear()
  mockCohortOn = undefined
})

describe("useGatedNavItems — company-admin house style", () => {
  it("switch OFF: exactly the classic company-admin menu", () => {
    const { result } = renderHook(() => useGatedNavItems("company-admin"))
    expect(result.current).toBe(COMPANY_ADMIN_NAV_ITEMS)
  })

  it("switch ON: People, no Settings, no Help (RM-4: both are in the footer)", () => {
    localStorage.setItem(SWITCH, "true")
    const l = labels(renderHook(() => useGatedNavItems("company-admin")).result.current)
    expect(l).toContain("People")
    expect(l).not.toContain("Help & Support")
    expect(l).not.toContain("Settings")
    expect(l).not.toContain("User Management")
  })

  it("switch ON (RM-5): no Cohort Read-out row even when the org has it — it is a tab of the Analytics hub", () => {
    localStorage.setItem(SWITCH, "true")
    mockCohortOn = true
    const l = labels(renderHook(() => useGatedNavItems("company-admin")).result.current)
    expect(l).not.toContain("Cohort Read-out")
    expect(l).toEqual(["Dashboard", "People", "Organization", "Analytics", "Surveys"])
  })

  it("switch OFF keeps the Cohort Read-out row when the org has it (unchanged by RM-5)", () => {
    mockCohortOn = true
    const l = labels(renderHook(() => useGatedNavItems("company-admin")).result.current)
    expect(l.at(-1)).toBe("Cohort Read-out")
    expect(l.slice(0, -1)).toEqual(labels(COMPANY_ADMIN_NAV_ITEMS))
  })

  it("is read at render time: flipping the switch and re-rendering changes the menu", () => {
    const { result, rerender } = renderHook(() => useGatedNavItems("company-admin"))
    expect(labels(result.current)).toContain("User Management")
    localStorage.setItem(SWITCH, "true")
    rerender()
    expect(labels(result.current)).toContain("People")
    expect(labels(result.current)).not.toContain("User Management")
  })

  it("switch ON changes no other role's menu", () => {
    localStorage.setItem(SWITCH, "true")
    for (const role of ["manager", "practitioner", "distributor", "user"] as const) {
      const { result } = renderHook(() => useGatedNavItems(role))
      expect(labels(result.current)).toEqual(labels(NAV_ITEMS_BY_ROLE[role]))
    }
  })
})
