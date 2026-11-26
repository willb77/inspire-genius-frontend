/**
 * @jest-environment jsdom
 */
/**
 * RM-6 B (CSA #2236; Bill's "RM-6 B go", 2026-11-26): the practitioner's menu
 * follows the `practitioner-client-roster` status.
 *
 *  - ON: Practitioner Home and My Clients leave the menu (both open from the
 *    Studio header); every other row stays, in order.
 *  - OFF: the menu is exactly PRACTITIONER_NAV_ITEMS, today's.
 *  - Other roles never ask, and never change.
 *
 * Against the REAL navigation module, so the guard is about the real list.
 */
import { renderHook } from "@testing-library/react"

import { useGatedNavItems } from "../useGatedNavItems"
import { NAV_ITEMS_BY_ROLE, PRACTITIONER_NAV_ITEMS, practitionerFrontPageMenu } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"

jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useWorkspaceNavItems: (items: unknown) => items,
  withWorkspaceVerticals: (items: unknown[], extra: unknown[]) => [...items, ...extra],
}))
jest.mock("@/hooks/super-admin/usePrismExam", () => ({
  useExamAccess: () => ({ data: undefined }),
}))
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: () => ({ data: undefined }),
}))

let mockOn = false
const mockAsked: boolean[] = []
jest.mock("@/hooks/switches/usePractitionerClientRosterEnabled", () => ({
  usePractitionerClientRosterEnabled: (enabled = true) => {
    mockAsked.push(enabled)
    return enabled && mockOn
  },
}))

const routesOf = (items: { to: string }[]) => items.map((i) => i.to)

beforeEach(() => {
  mockOn = false
  mockAsked.length = 0
})

describe("RM-6 B: the practitioner menu follows the client-roster status", () => {
  it("OFF: exactly today's practitioner rows", () => {
    const { result } = renderHook(() => useGatedNavItems("practitioner"))
    expect(result.current).toEqual(PRACTITIONER_NAV_ITEMS)
    expect(routesOf(result.current)).toContain(ROUTES.PRACTITIONER.HOME)
    expect(routesOf(result.current)).toContain(ROUTES.PRACTITIONER.CLIENTS)
  })

  it("ON: Practitioner Home and My Clients leave; every other row stays, in order", () => {
    mockOn = true
    const { result } = renderHook(() => useGatedNavItems("practitioner"))
    const expected = PRACTITIONER_NAV_ITEMS.filter(
      (i) => i.to !== ROUTES.PRACTITIONER.HOME && i.to !== ROUTES.PRACTITIONER.CLIENTS,
    )
    expect(result.current).toEqual(expected)
    expect(result.current).toHaveLength(PRACTITIONER_NAV_ITEMS.length - 2)
    expect(result.current[0].to).toBe(ROUTES.PRACTITIONER.DEVELOPMENT)
  })

  it.each(["manager", "company-admin", "distributor", "user"] as const)(
    "%s never asks for the switch and keeps its rows",
    (role) => {
      mockOn = true
      const { result } = renderHook(() => useGatedNavItems(role))
      expect(mockAsked.every((asked) => asked === false)).toBe(true)
      expect(routesOf(result.current)).toEqual(routesOf(NAV_ITEMS_BY_ROLE[role]).filter((r) => routesOf(result.current).includes(r)))
      expect(result.current.length).toBeGreaterThan(0)
    },
  )

  it("the fold removes only the two rows, by route, from any list", () => {
    const list = [
      { to: ROUTES.PRACTITIONER.DEVELOPMENT, label: "Client Development Studio" },
      { to: ROUTES.PRACTITIONER.HOME, label: "Practitioner Home" },
      { to: ROUTES.PRACTITIONER.CLIENTS, label: "My Clients" },
      { to: ROUTES.PRACTITIONER.SCHEDULE, label: "Schedule" },
    ] as Parameters<typeof practitionerFrontPageMenu>[0]
    expect(routesOf(practitionerFrontPageMenu(list))).toEqual([
      ROUTES.PRACTITIONER.DEVELOPMENT,
      ROUTES.PRACTITIONER.SCHEDULE,
    ])
  })
})
