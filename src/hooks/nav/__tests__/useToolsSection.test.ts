/**
 * @jest-environment jsdom
 *
 * The consolidated "Tools" section (2026-08-12).
 *
 * Three of these assertions carry over from the deleted `useEntitledVerticalItems`
 * suite — the launcher catalogue passing through with its `disabled` flags
 * intact, Platform Alerts appearing only for an allow-listed super-admin, and
 * the empty-registry case. The rest are new and pin the things the request
 * actually asked for: ONE section, super-admin only, expanded.
 */
import { renderHook } from "@testing-library/react"
import {
  useToolsSection,
  canSeeToolsSection,
  TOOLS_SECTION_LABEL,
} from "../useToolsSection"

const mockLauncher = jest.fn()
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useVerticalLauncherSection: () => mockLauncher(),
}))

const mockBroadcast = jest.fn()
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => mockBroadcast(),
}))

jest.mock("@/constants/sidebar-sections", () => ({
  BROADCAST_SIDEBAR_SECTION: {
    items: [
      {
        to: "/super-admin/broadcast-alert",
        icon: () => null,
        label: "Broadcast Alerts",
      },
    ],
  },
}))

jest.mock("@/constants/navigation", () => ({
  TOOL_ITEMS_BY_ROLE: {
    manager: [{ to: "/manager/development", icon: () => null, label: "Team Development Studio" }],
    "super-admin": [
      { to: "/manager/development", icon: () => null, label: "Team Development Studio" },
      { to: "/interview-practice", icon: () => null, label: "Interview Practice" },
      { to: "/super-admin/interview-live", icon: () => null, label: "Live Interview" },
      { to: "/super-admin/interview-studio", icon: () => null, label: "Interview Studio" },
    ],
  },
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockLauncher.mockReturnValue(null)
  mockBroadcast.mockReturnValue({ data: { authorized: false } })
})

describe("canSeeToolsSection", () => {
  /* Widened on 2026-08-31 (request) from super-admin-only to include manager
   * and practitioner — the two roster-holding roles.
   *
   * This assertion USED to read "super-admin and nobody else", and it failing
   * is what a deliberate scope change is supposed to look like. It is kept as
   * an exact set rather than loosened to `toBe(true)` per role, so the next
   * widening is also a conscious edit here.
   *
   * Why it matters more than it looks: both roles already had entries in
   * TOOL_ITEMS_BY_ROLE, kept deliberately when the section was narrowed on
   * 2026-08-12. Until this gate opened, those entries were correct data that
   * rendered NOWHERE — a nav constant whose own tests pass while the sidebar
   * shows nothing. */
  it("admits the roster-holding roles and nobody else", () => {
    for (const role of ["super-admin", "manager", "practitioner"] as const) {
      expect(canSeeToolsSection(role)).toBe(true)
    }
    for (const role of ["user", "company-admin", "distributor"] as const) {
      expect(canSeeToolsSection(role)).toBe(false)
    }
  })
})

describe("useToolsSection", () => {
  it("returns null for the roles still outside the gate, even with a full catalogue", () => {
    // The launcher is deliberately NON-empty here: a null return must come from
    // the role gate, not from there being nothing to show. Without this the
    // test would pass just as happily if the gate were removed.
    mockLauncher.mockReturnValue({
      items: [{ to: "/vertical/grant/dashboard", icon: () => null, label: "GRANT" }],
    })
    mockBroadcast.mockReturnValue({ data: { authorized: true } })

    for (const role of ["user", "company-admin", "distributor"] as const) {
      const { result } = renderHook(() => useToolsSection(role))
      expect(result.current).toBeNull()
    }
  })

  it("returns a populated section for manager and practitioner", () => {
    // The counterpart of the test above, and the one that would have caught the
    // real defect: TOOL_ITEMS_BY_ROLE entries for these roles rendered nowhere
    // because the gate was closed, so every data-level nav test passed while
    // the sidebar was empty.
    for (const role of ["manager", "practitioner"] as const) {
      const { result } = renderHook(() => useToolsSection(role))
      expect(result.current).not.toBeNull()
      expect((result.current?.items ?? []).length).toBeGreaterThan(0)
    }
  })

  it("builds exactly one section, labelled Tools and EXPANDED", () => {
    // Expanded is the point of the request: a super-admin must see and click
    // the tools without first expanding anything.
    const { result } = renderHook(() => useToolsSection("super-admin"))
    expect(result.current?.label).toBe(TOOLS_SECTION_LABEL)
    expect(result.current?.defaultCollapsed).toBe(false)
  })

  it("gives super-admin Team Development Studio, Live Interview and Interview Studio", () => {
    const { result } = renderHook(() => useToolsSection("super-admin"))
    const labels = result.current?.items.map((i) => i.label) ?? []
    expect(labels).toEqual(
      expect.arrayContaining([
        "Team Development Studio",
        "Live Interview",
        "Interview Studio",
      ]),
    )
  })

  it("leads with Bio Capture, then role tools, then the vertical catalogue", () => {
    mockLauncher.mockReturnValue({
      items: [{ to: "/vertical/grant/dashboard", icon: () => null, label: "GRANT" }],
    })
    const { result } = renderHook(() => useToolsSection("super-admin"))
    const labels = result.current?.items.map((i) => i.label) ?? []
    expect(labels[0]).toBe("Bio Capture")
    expect(labels.indexOf("Interview Studio")).toBeLessThan(labels.indexOf("GRANT"))
  })

  it("passes the launcher catalogue through with disabled flags intact", () => {
    // Carried over from useEntitledVerticalItems. An unentitled vertical must
    // stay greyed rather than be silently dropped or quietly un-greyed —
    // useVerticalAccess grants super-admin no bypass, so un-greying would
    // produce a link that bounces to /home.
    mockLauncher.mockReturnValue({
      items: [
        { to: "/vertical/grant/dashboard", icon: () => null, label: "GRANT", disabled: false },
        { to: "/vertical/honor", icon: () => null, label: "Honor Foundation", disabled: true },
      ],
    })
    const { result } = renderHook(() => useToolsSection("super-admin"))
    const verticals = (result.current?.items ?? []).filter((i) =>
      i.to.startsWith("/vertical/"),
    )
    expect(verticals.map((i) => [i.label, i.disabled])).toEqual([
      ["GRANT", false],
      ["Honor Foundation", true],
    ])
  })

  it("appends Platform Alerts only for an allow-listed super-admin", () => {
    // Carried over. Access-gated by a DB allowlist, so it is withheld outright
    // rather than greyed — a non-allowlisted super-admin has no upgrade path.
    const { result: denied } = renderHook(() => useToolsSection("super-admin"))
    expect(denied.current?.items.map((i) => i.label)).not.toContain("Broadcast Alerts")

    mockBroadcast.mockReturnValue({ data: { authorized: true } })
    const { result: allowed } = renderHook(() => useToolsSection("super-admin"))
    expect(allowed.current?.items.map((i) => i.label)).toContain("Broadcast Alerts")
  })

  it("still returns a section when the registry produced nothing", () => {
    // Carried over from the "[] when no section" case, inverted: the utility
    // tools stand on their own, so an empty registry must not blank the menu.
    mockLauncher.mockReturnValue(null)
    const { result } = renderHook(() => useToolsSection("super-admin"))
    expect(result.current).not.toBeNull()
    expect(result.current?.items.map((i) => i.label)).toContain("Interview Studio")
  })

  it("does not repeat an item that appears in two sources", () => {
    // Interview Practice is both a role tool item and, elsewhere, a workspace
    // entry; a duplicate `to` would render twice and double-highlight.
    mockLauncher.mockReturnValue({
      items: [{ to: "/interview-practice", icon: () => null, label: "Interview Practice" }],
    })
    const { result } = renderHook(() => useToolsSection("super-admin"))
    const tos = result.current?.items.map((i) => i.to) ?? []
    expect(tos.length).toBe(new Set(tos).size)
  })
})
