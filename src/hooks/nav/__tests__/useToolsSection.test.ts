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
  it("admits super-admin and nobody else", () => {
    expect(canSeeToolsSection("super-admin")).toBe(true)
    for (const role of [
      "user",
      "manager",
      "company-admin",
      "practitioner",
      "distributor",
    ] as const) {
      expect(canSeeToolsSection(role)).toBe(false)
    }
  })
})

describe("useToolsSection", () => {
  it("returns null for every non-super-admin role, even with a full catalogue", () => {
    // The launcher is deliberately NON-empty here: a null return must come from
    // the role gate, not from there being nothing to show. Without this the
    // test would pass just as happily if the gate were removed.
    mockLauncher.mockReturnValue({
      items: [{ to: "/vertical/grant/dashboard", icon: () => null, label: "GRANT" }],
    })
    mockBroadcast.mockReturnValue({ data: { authorized: true } })

    for (const role of [
      "user",
      "manager",
      "company-admin",
      "practitioner",
      "distributor",
    ] as const) {
      const { result } = renderHook(() => useToolsSection(role))
      expect(result.current).toBeNull()
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
