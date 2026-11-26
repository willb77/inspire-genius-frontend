/**
 * @jest-environment jsdom
 *
 * The company-admin menu (RM-9a, 2026-11-26): the house-style menu, baked into
 * COMPANY_ADMIN_NAV_ITEMS. Until RM-9a it was derived at render time from a
 * classic list by `companyAdminHouseMenu` when the `company-admin` house switch
 * was on — which both tiers' builds always had. These are the assertions the
 * old suite made about the switch-ON menu, now made of the list itself, plus
 * the one behaviour RM-9a removes on purpose: the localStorage escape.
 * CSA: docs/analysis/2026-11-26-rm-9-csa.md (monorepo #2237).
 *
 * RM-4 (2026-11-25): Role Play and Résumé Writer are in the My Workspace
 * section, and Settings and Help & Support in the footer section.
 */
import { renderHook } from "@testing-library/react"
import { COMPANY_ADMIN_NAV_ITEMS, FOOTER_NAV_ITEMS_BY_ROLE, NAV_ITEMS_BY_ROLE } from "@/constants/navigation"
import { useGatedNavItems } from "@/hooks/nav/useGatedNavItems"

jest.mock("@/hooks/super-admin/usePrismExam", () => ({ useExamAccess: () => ({ data: undefined }) }))
jest.mock("@/hooks/job-fit/useSavedJobs", () => ({
  ...jest.requireActual("@/hooks/job-fit/useSavedJobs"),
  useSavedJobsEnabled: () => false,
}))
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => ({ data: [], isLoading: false }),
}))
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => false,
}))

const SWITCH = "house_style_company-admin"
const rows = (items: { label: string; to: string }[]) => items.map((i) => [i.label, i.to])

const BAKED = [
  ["Dashboard", "/company-admin/dashboard"],
  ["People", "/company-admin/users"],
  ["Organization", "/company-admin/organization"],
  ["Reports", "/company-admin/analytics"],
  ["Surveys", "/surveys"],
]

afterEach(() => localStorage.clear())

describe("company-admin menu (house style, baked)", () => {
  it("five rows — People, Organization and Reports are hubs; no Settings, Costs or Help", () => {
    expect(rows(COMPANY_ADMIN_NAV_ITEMS)).toEqual(BAKED)
    expect(NAV_ITEMS_BY_ROLE["company-admin"]).toBe(COMPANY_ADMIN_NAV_ITEMS)
    expect(
      COMPANY_ADMIN_NAV_ITEMS.some((i) => i.to.includes("/settings") || i.to.includes("/costs") || i.to === "/help"),
    ).toBe(false)
  })

  it("no hub tab is also a menu row (Bulk Import, Culture Docs, AI Observability, Cohort Read-out)", () => {
    const tos = COMPANY_ADMIN_NAV_ITEMS.map((i) => i.to)
    for (const tab of [
      "/company-admin/bulk-import",
      "/company-admin/culture",
      "/company-admin/observability",
      "/company-admin/cohort-readout",
    ]) {
      expect(tos).not.toContain(tab)
    }
  })

  it.each([undefined, "true", "false"])(
    "the menu a company admin gets is the same whatever house_style_company-admin says (%s) — the escape is gone",
    (value) => {
      if (value !== undefined) localStorage.setItem(SWITCH, value)
      const { result } = renderHook(() => useGatedNavItems("company-admin"))
      expect(rows(result.current)).toEqual(BAKED)
    },
  )

  it("RM-4: the company-admin footer is Settings → the shared /settings, then Help", () => {
    expect(FOOTER_NAV_ITEMS_BY_ROLE["company-admin"]?.map((i) => [i.label, i.to])).toEqual([
      ["Settings", "/settings"],
      ["Help & Support", "/help"],
    ])
  })
})
