/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import { __resetRegistry, registerVertical } from "@/verticals/core"
import {
  useVerticalLauncherSection,
  useWorkspaceNavItems,
  useWorkspaceVerticalItems,
  withWorkspaceVerticals,
} from "../useVerticalLauncher"

// Control the entitlement read by mocking the leaf module (the barrel re-exports
// from it), so the real registry + listEntitledVerticals stay intact.
const mockUseEnabledVerticals = jest.fn()
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => mockUseEnabledVerticals(),
}))

function setEnabled(list: string[]) {
  mockUseEnabledVerticals.mockReturnValue({ data: list, isLoading: false })
}

beforeEach(() => {
  jest.clearAllMocks()
  __resetRegistry()
  registerVertical({
    key: "grant",
    title: "GRANT",
    description: "aid",
    routePrefix: "/vertical/grant",
    homePath: "/vertical/grant/dashboard",
  })
  registerVertical({
    key: "honor",
    title: "Honor Foundation",
    description: "coach workbench",
    routePrefix: "/vertical/honor",
    homePath: "/vertical/honor/dashboard",
  })
  registerVertical({
    key: "job-fit",
    title: "Job Fit",
    description: "fit ranking",
    routePrefix: "/vertical/job-fit",
    homePath: "/vertical/job-fit/matches",
  })
  registerVertical({
    key: "lumen",
    title: "Lumen",
    description: "b2c diagnostics",
    routePrefix: "/vertical/lumen",
    homePath: "/vertical/lumen/dashboard",
  })
})

// Contract as of 2026-07-31.
//
// Two rules, and they are independent:
//   1. ENTITLEMENT decides whether an entry is USABLE (`disabled`), never
//      whether it is VISIBLE — an unentitled vertical is listed greyed so the
//      catalogue stays discoverable and the gate legible.
//   2. HIDDEN_VERTICALS decides visibility outright. Honor Foundation is
//      withheld from the list entirely — a different mechanism from (1), and
//      the tests below pin that the two do not get conflated.
//
// The section is now labelled "Tools" and ships rolled up. WORKSPACE_VERTICALS
// is empty, so Job Fit and Lumen fall through to it like every other vertical.
describe("useVerticalLauncherSection", () => {
  test("is labelled Tools and ships rolled up", () => {
    setEnabled(["grant"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current).not.toBeNull()
    expect(result.current!.label).toBe("Tools")
    expect(result.current!.defaultCollapsed).toBe(true)
  })

  test("lists every visible vertical and links to homePath", () => {
    setEnabled(["grant", "job-fit"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current!.items.map((i) => i.label)).toEqual([
      "GRANT",
      "Job Fit",
      "Lumen",
    ])
    expect(result.current!.items.map((i) => i.to)).toEqual([
      "/vertical/grant/dashboard",
      "/vertical/job-fit/matches",
      "/vertical/lumen/dashboard",
    ])
  })

  test("HIDES Honor Foundation even for a user entitled to it", () => {
    // The distinction that matters: entitlement greys, HIDDEN_VERTICALS omits.
    // Honor is entitled here and must STILL be absent.
    setEnabled(["honor", "grant"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current!.items.map((i) => i.label)).not.toContain(
      "Honor Foundation",
    )
  })

  test("includes GRANT — financials live under Tools, not their own section", () => {
    setEnabled(["grant"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    const grant = result.current!.items.find((i) => i.label === "GRANT")
    expect(grant).toBeDefined()
    expect(grant!.disabled).toBe(false)
  })

  test("greys out (does NOT hide) verticals the user has no entitlement for", () => {
    setEnabled(["grant"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    const byLabel = Object.fromEntries(
      result.current!.items.map((i) => [i.label, i.disabled]),
    )
    expect(byLabel["GRANT"]).toBe(false)
    expect(byLabel["Job Fit"]).toBe(true)
    expect(byLabel["Lumen"]).toBe(true)
  })

  test("still lists the catalogue when the user is entitled to nothing", () => {
    setEnabled([])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current!.items.map((i) => i.label)).toEqual([
      "GRANT",
      "Job Fit",
      "Lumen",
    ])
    expect(result.current!.items.every((i) => i.disabled)).toBe(true)
  })

  test("entitlement keys that aren't registered verticals invent nothing", () => {
    setEnabled(["not-a-vertical", "grant"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current!.items.map((i) => i.label)).toEqual([
      "GRANT",
      "Job Fit",
      "Lumen",
    ])
  })

  test("Job Fit and Lumen are in Tools now, not held back for My Workspace", () => {
    setEnabled(["job-fit", "lumen"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current!.items.map((i) => i.label)).toEqual(
      expect.arrayContaining(["Job Fit", "Lumen"]),
    )
  })
})

// WORKSPACE_VERTICALS is empty, so the workspace-splice mechanism is dormant.
// It is retained rather than deleted — re-promoting a vertical is a one-word
// edit — so these pin that it stays a clean no-op meanwhile.
describe("useWorkspaceVerticalItems (mechanism retained, currently empty)", () => {
  test("returns nothing while WORKSPACE_VERTICALS is empty", () => {
    setEnabled(["grant", "honor", "job-fit", "lumen"])
    const { result } = renderHook(() => useWorkspaceVerticalItems())
    expect(result.current).toEqual([])
  })
})

const icon = () => null
const MENU = [
  { to: "/home", icon, label: "Home" },
  { to: "/documents", icon, label: "My Documents" },
  { to: "/settings", icon, label: "Settings" },
  { to: "/help", icon, label: "Help & Support" },
]

describe("withWorkspaceVerticals", () => {
  const extra = [{ to: "/vertical/lumen/dashboard", icon, label: "Lumen" }]

  test("splices above the Settings/Help tail", () => {
    expect(withWorkspaceVerticals(MENU, extra).map((i) => i.label)).toEqual([
      "Home",
      "My Documents",
      "Lumen",
      "Settings",
      "Help & Support",
    ])
  })

  test("appends when the menu has no Settings/Help tail", () => {
    const tailless = [{ to: "/practitioner/home", icon, label: "Practitioner Home" }]
    expect(withWorkspaceVerticals(tailless, extra).map((i) => i.label)).toEqual([
      "Practitioner Home",
      "Lumen",
    ])
  })

  test("returns the SAME array when there is nothing to merge (stable identity)", () => {
    expect(withWorkspaceVerticals(MENU, [])).toBe(MENU)
  })

  test("does not duplicate an item already present by route", () => {
    const already = [...MENU, extra[0]]
    expect(withWorkspaceVerticals(already, extra)).toBe(already)
  })
})

describe("useWorkspaceNavItems", () => {
  test("leaves the menu untouched, and returns the SAME array", () => {
    // Identity matters, not just equality: this feeds a `navSections` memo in
    // every layout, so a fresh array each render would churn them all.
    setEnabled(["job-fit", "lumen"])
    const { result } = renderHook(() => useWorkspaceNavItems(MENU))
    expect(result.current).toBe(MENU)
  })

  test("no vertical is injected into My Workspace regardless of entitlement", () => {
    setEnabled(["grant", "honor", "job-fit", "lumen"])
    const { result } = renderHook(() => useWorkspaceNavItems(MENU))
    expect(result.current.map((i) => i.label)).toEqual([
      "Home",
      "My Documents",
      "Settings",
      "Help & Support",
    ])
  })
})
