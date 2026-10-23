/**
 * @jest-environment jsdom
 *
 * DS-nav (2026-10-22, request: "Direction Setting is not visible in the left
 * side menu for a user").
 *
 * The `user` role has no Tools section, so while Direction Setting lived only in
 * the Tools catalogue an entitled user had no sidebar door to it. It is now a
 * workspace vertical, like Career Fit (2026-10-18) and Career & Education
 * Discovery (2026-10-20): one row in every entitled account's MAIN menu, opening
 * on its journey; hidden, not greyed, for everyone else; and no longer listed in
 * Tools, so the coach roles do not see it twice.
 *
 * Everything below runs against the REAL registry (all manifests via
 * "@/verticals"), the REAL navigation constants and the REAL useToolsSection
 * gate. Only the entitlement read and the broadcast allowlist are mocked.
 */
import { renderHook } from "@testing-library/react"
import "@/verticals"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import { getUserNavItems } from "@/constants/navigation"
import { useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher"
import { useGatedNavItems } from "@/hooks/nav/useGatedNavItems"
import { useToolsSection } from "@/hooks/nav/useToolsSection"

const mockUseEnabledVerticals = jest.fn()
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => mockUseEnabledVerticals(),
}))
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: false } }),
}))

const DS = "/vertical/direction-setting/journey"
const CAREER_FIT = "/vertical/job-fit/matches"
const DISCOVERY = "/vertical/career-discovery/journey"

function setEnabled(list: string[] | undefined) {
  mockUseEnabledVerticals.mockReturnValue({ data: list, isLoading: false })
}

const walk = (items: NavItemDef[]): NavItemDef[] =>
  items.flatMap((i) => [i, ...walk(i.children ?? [])])

/**
 * Both main-menu sources a role can be shown: `UserLayout` / `SuperAdminLayout`
 * build it from getUserNavItems, `UnifiedLayout` from the role's own list via
 * useGatedNavItems. Plus the Tools section that sits under it (null for roles
 * without one).
 */
function menusFor(role: UserRole) {
  const { result } = renderHook(() => ({
    workspace: useWorkspaceNavItems(getUserNavItems(true)),
    gated: useGatedNavItems(role),
    tools: useToolsSection(role),
  }))
  return {
    mains: [result.current.workspace, result.current.gated],
    toolRows: walk(result.current.tools?.items ?? []),
  }
}

describe("DS-nav: Direction Setting in the main menu for entitled accounts", () => {
  test("a user entitled to direction-setting sees one live row linking to the journey", () => {
    setEnabled(["direction-setting"])
    for (const main of menusFor("user").mains) {
      const rows = main.filter((i) => i.to === DS)
      expect(rows).toHaveLength(1)
      expect(rows[0].label).toBe("Direction Setting")
      expect(rows[0].disabled).toBe(false)
      // Spliced above the Document Library / Settings / Help tail.
      const at = main.findIndex((i) => i.to === DS)
      expect(at).toBeLessThan(main.findIndex((i) => i.label === "Document Library"))
    }
  })

  test.each([[[]], [["job-fit"]], [["grant", "lumen", "career-discovery"]], [undefined]])(
    "a user NOT entitled to it sees no row, not even a greyed one (%p)",
    (ents) => {
      setEnabled(ents as string[] | undefined)
      const { mains, toolRows } = menusFor("user")
      for (const main of mains) {
        expect(main.map((i) => i.to)).not.toContain(DS)
        expect(main.map((i) => i.label)).not.toContain("Direction Setting")
      }
      expect(toolRows).toEqual([])
    },
  )

  test.each(["manager", "practitioner", "super-admin"] as const)(
    "%s: entitled → once in the main menu, never also in Tools",
    (role) => {
      setEnabled(["direction-setting", "grant"])
      const { mains, toolRows } = menusFor(role)
      for (const main of mains) {
        expect(main.filter((i) => i.to === DS)).toHaveLength(1)
      }
      // Tools is still there (GRANT proves the catalogue rendered) but no
      // longer lists Direction Setting.
      expect(toolRows.map((r) => r.to)).toContain("/vertical/grant/dashboard")
      expect(toolRows.map((r) => r.to)).not.toContain(DS)
    },
  )

  test.each(["manager", "practitioner", "super-admin"] as const)(
    "%s: not entitled → in neither the main menu nor Tools",
    (role) => {
      setEnabled(["grant"])
      const { mains, toolRows } = menusFor(role)
      for (const main of mains) expect(main.map((i) => i.to)).not.toContain(DS)
      expect(toolRows.map((r) => r.to)).not.toContain(DS)
    },
  )

  test("Career Fit and Career & Education Discovery are unchanged, in registry order around it", () => {
    setEnabled(["job-fit", "career-discovery", "direction-setting"])
    for (const main of menusFor("user").mains) {
      const spliced = main.filter((i) => [DISCOVERY, DS, CAREER_FIT].includes(i.to))
      expect(spliced.map((i) => [i.label, i.to])).toEqual([
        ["Career & Education Discovery", DISCOVERY],
        ["Direction Setting", DS],
        ["Career Fit", CAREER_FIT],
      ])
      expect(spliced.every((i) => i.disabled === false)).toBe(true)
    }
  })

  test("without direction-setting, Career Fit alone is spliced as before", () => {
    setEnabled(["job-fit"])
    for (const main of menusFor("user").mains) {
      const spliced = main.filter((i) => i.to.startsWith("/vertical/"))
      expect(spliced.map((i) => i.to)).toEqual([CAREER_FIT])
    }
  })
})
