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
// The section is now labelled "Tools" and ships rolled up. As of 2026-08-04
// WORKSPACE_VERTICALS = {job-fit}, so Job Fit is promoted to My Workspace and
// drops OUT of Tools; Lumen (and the rest) still fall through to Tools.
describe("useVerticalLauncherSection", () => {
  test("is labelled Tools and ships rolled up", () => {
    setEnabled(["grant"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current).not.toBeNull()
    expect(result.current!.label).toBe("Tools")
    expect(result.current!.defaultCollapsed).toBe(true)
  })

  test("lists every visible vertical and links to homePath", () => {
    // Job Fit is back in this catalogue as of 2026-08-12: WORKSPACE_VERTICALS
    // was emptied when the user menu was cut to six entries, and this section
    // filters on that set — so removing its My Workspace shortcut put it here
    // rather than nowhere. Registry order.
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
    expect(byLabel["Lumen"]).toBe(true)
    // Job Fit rejoined the catalogue 2026-08-12 and is greyed like any other
    // unentitled entry.
    expect(byLabel["Job Fit"]).toBe(true)
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

  test("Lumen and Job Fit both sit in Tools now", () => {
    // Job Fit was promoted out to My Workspace on 2026-08-04 and returned here
    // on 2026-08-12 when that shortcut was withdrawn. The two placements are
    // mutually exclusive by construction — this section filters on
    // WORKSPACE_VERTICALS — so a vertical in both would be a bug.
    setEnabled(["job-fit", "lumen"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    const labels = result.current!.items.map((i) => i.label)
    expect(labels).toContain("Lumen")
    expect(labels).toContain("Job Fit")
  })
})

// WORKSPACE_VERTICALS is EMPTY as of 2026-08-12: the user menu is a fixed
// six entries and Job Fit is not one of them, so nothing is promoted into My
// Workspace any more. The mechanism is retained rather than deleted (see the
// file's own note), which is what these cases now cover — a no-op that stays a
// no-op, so re-promoting later is a one-word edit and not a rebuild.
describe("useWorkspaceVerticalItems (nothing promoted to My Workspace)", () => {
  test("returns nothing, whatever the user is entitled to", () => {
    for (const ents of [[], ["grant"], ["job-fit"], ["grant", "honor", "job-fit", "lumen"]]) {
      setEnabled(ents)
      const { result } = renderHook(() => useWorkspaceVerticalItems())
      expect(result.current).toEqual([])
    }
  })

  test("keeps a stable identity so the splice stays a cheap no-op", () => {
    // It feeds a navSections memo in every layout; a fresh [] each render would
    // churn them all for nothing.
    setEnabled(["job-fit"])
    const { result, rerender } = renderHook(() => useWorkspaceVerticalItems())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  test("the vertical itself is untouched — only the menu entry went", () => {
    // Re-promoting must be a one-line change to WORKSPACE_VERTICALS, not a
    // route restoration. Job Fit still resolves and still appears in the Tools
    // catalogue, which is asserted above.
    setEnabled(["job-fit"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current!.items.find((i) => i.label === "Job Fit")!.to).toBe(
      "/vertical/job-fit/matches",
    )
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
  test("keeps a stable array identity across re-renders (feeds navSections memos)", () => {
    // Identity matters, not just equality: this feeds a `navSections` memo in
    // every layout, so a fresh array each render would churn them all. Even now
    // that Job Fit is spliced in, the memo must return the SAME array when the
    // inputs are unchanged.
    setEnabled(["job-fit", "lumen"])
    const { result, rerender } = renderHook(() => useWorkspaceNavItems(MENU))
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })

  test("leaves the menu untouched — nothing is spliced any more", () => {
    // Both WORKSPACE_VERTICALS and WORKSPACE_VERTICAL_LINKS are empty as of
    // 2026-08-12, so this hook is now an identity over its input. Asserted with
    // a fully-entitled user: if either set is repopulated, this fails.
    setEnabled(["grant", "honor", "job-fit", "lumen"])
    const { result } = renderHook(() => useWorkspaceNavItems(MENU))
    expect(result.current.map((i) => i.label)).toEqual([
      "Home",
      "My Documents",
      "Settings",
      "Help & Support",
    ])
  })

  test("returns the input array itself, not a copy", () => {
    // withWorkspaceVerticals short-circuits when there is nothing to merge.
    // Identity, not just equality — the layouts memoise on it.
    setEnabled(["job-fit", "honor"])
    const { result } = renderHook(() => useWorkspaceNavItems(MENU))
    expect(result.current).toBe(MENU)
  })
})
