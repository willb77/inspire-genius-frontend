/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import { __resetRegistry, registerVertical } from "@/verticals/core"
import { useVerticalLauncherSection } from "../useVerticalLauncher"

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
})
