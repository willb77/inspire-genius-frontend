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

describe("useVerticalLauncherSection", () => {
  test("lists entitled non-detailed verticals (honor) and links to homePath", () => {
    setEnabled(["grant", "honor"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current).not.toBeNull()
    expect(result.current!.label).toBe("Verticals")
    expect(result.current!.items.map((i) => i.label)).toEqual(["Honor Foundation"])
    expect(result.current!.items[0].to).toBe("/vertical/honor/dashboard")
  })

  test("excludes GRANT (it has its own detailed section) → null when only grant", () => {
    setEnabled(["grant"])
    expect(renderHook(() => useVerticalLauncherSection()).result.current).toBeNull()
  })

  test("null when the user is entitled to nothing", () => {
    setEnabled([])
    expect(renderHook(() => useVerticalLauncherSection()).result.current).toBeNull()
  })

  test("ignores entitlement keys that aren't registered verticals", () => {
    setEnabled(["not-a-vertical", "honor"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current!.items.map((i) => i.label)).toEqual(["Honor Foundation"])
  })

  test("excludes workspace verticals (Job Fit, Lumen) — they live in My Workspace", () => {
    setEnabled(["honor", "job-fit", "lumen"])
    const { result } = renderHook(() => useVerticalLauncherSection())
    expect(result.current!.items.map((i) => i.label)).toEqual(["Honor Foundation"])
  })

  test("null when the only entitled verticals are workspace verticals", () => {
    setEnabled(["job-fit", "lumen"])
    expect(renderHook(() => useVerticalLauncherSection()).result.current).toBeNull()
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
  })

  test("returns only the entitled workspace verticals", () => {
    setEnabled(["lumen"])
    const { result } = renderHook(() => useWorkspaceVerticalItems())
    expect(result.current.map((i) => i.label)).toEqual(["Lumen"])
  })

  test("empty when the user is entitled to no workspace vertical", () => {
    setEnabled(["grant", "honor"])
    expect(renderHook(() => useWorkspaceVerticalItems()).result.current).toEqual([])
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

  test("leaves the menu untouched for a user entitled to neither", () => {
    setEnabled(["honor"])
    expect(renderHook(() => useWorkspaceNavItems(MENU)).result.current).toBe(MENU)
  })
})
