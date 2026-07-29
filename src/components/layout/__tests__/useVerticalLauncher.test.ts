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

// The contract as of 2026-07-28: entitlement decides whether an entry is
// USABLE (`disabled`), not whether it is VISIBLE. Every registered vertical is
// listed for every user, so the catalogue is discoverable and the gate legible.
describe("useVerticalLauncherSection", () => {
  test("lists EVERY non-workspace vertical and links to homePath", () => {
    setEnabled(["grant", "honor"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current).not.toBeNull()
    expect(result.current!.label).toBe("Verticals")
    expect(result.current!.items.map((i) => i.label)).toEqual([
      "GRANT",
      "Honor Foundation",
    ])
    expect(result.current!.items.map((i) => i.to)).toEqual([
      "/vertical/grant/dashboard",
      "/vertical/honor/dashboard",
    ])
  })

  test("includes GRANT — financials live under Verticals, not their own section", () => {
    setEnabled(["grant"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    const grant = result.current!.items.find((i) => i.label === "GRANT")
    expect(grant).toBeDefined()
    expect(grant!.disabled).toBe(false)
  })

  test("greys out (does NOT hide) verticals the user has no entitlement for", () => {
    setEnabled(["honor"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    const byLabel = Object.fromEntries(
      result.current!.items.map((i) => [i.label, i.disabled]),
    )
    expect(byLabel["Honor Foundation"]).toBe(false)
    expect(byLabel["GRANT"]).toBe(true)
  })

  test("still lists the catalogue when the user is entitled to nothing", () => {
    setEnabled([])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current!.items.map((i) => i.label)).toEqual([
      "GRANT",
      "Honor Foundation",
    ])
    expect(result.current!.items.every((i) => i.disabled)).toBe(true)
  })

  test("entitlement keys that aren't registered verticals invent nothing", () => {
    setEnabled(["not-a-vertical", "honor"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current!.items.map((i) => i.label)).toEqual([
      "GRANT",
      "Honor Foundation",
    ])
  })

  test("excludes workspace verticals (Job Fit, Lumen) — they live in My Workspace", () => {
    setEnabled(["honor", "job-fit", "lumen"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current!.items.map((i) => i.label)).not.toEqual(
      expect.arrayContaining(["Job Fit", "Lumen"]),
    )
  })
})

describe("useWorkspaceVerticalItems", () => {
  test("returns Job Fit + Lumen entries linked to their homePath", () => {
    setEnabled(["grant", "honor", "job-fit", "lumen"])
    const { result } = renderHook(() => useWorkspaceVerticalItems())
    expect(result.current.map((i) => i.label)).toEqual(["Job Fit", "Lumen"])
    expect(result.current.map((i) => i.to)).toEqual([
      "/vertical/job-fit/matches",
      "/vertical/lumen/dashboard",
    ])
    expect(result.current.every((i) => i.disabled === false)).toBe(true)
  })

  test("lists BOTH workspace verticals, greying the unentitled one", () => {
    setEnabled(["lumen"])
    const { result } = renderHook(() => useWorkspaceVerticalItems())
    expect(result.current.map((i) => [i.label, i.disabled])).toEqual([
      ["Job Fit", true],
      ["Lumen", false],
    ])
  })

  test("all greyed when the user is entitled to no workspace vertical", () => {
    setEnabled(["grant", "honor"])
    const { result } = renderHook(() => useWorkspaceVerticalItems())
    expect(result.current.map((i) => i.label)).toEqual(["Job Fit", "Lumen"])
    expect(result.current.every((i) => i.disabled)).toBe(true)
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
  test("puts Job Fit + Lumen into the workspace menu above Settings/Help", () => {
    setEnabled(["job-fit", "lumen"])
    const { result } = renderHook(() => useWorkspaceNavItems(MENU))
    expect(result.current.map((i) => i.label)).toEqual([
      "Home",
      "My Documents",
      "Job Fit",
      "Lumen",
      "Settings",
      "Help & Support",
    ])
  })

  test("still lists them (greyed) for a user entitled to neither", () => {
    setEnabled(["honor"])
    const { result } = renderHook(() => useWorkspaceNavItems(MENU))
    expect(result.current.map((i) => i.label)).toEqual([
      "Home",
      "My Documents",
      "Job Fit",
      "Lumen",
      "Settings",
      "Help & Support",
    ])
    expect(result.current.filter((i) => i.disabled).map((i) => i.label)).toEqual([
      "Job Fit",
      "Lumen",
    ])
  })
})
