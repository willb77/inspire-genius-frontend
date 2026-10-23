/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react"
import "@/verticals"
import {
  WORKSPACE_VERTICALS,
  useVerticalLauncherSection,
  useWorkspaceVerticalItems,
} from "@/components/layout/useVerticalLauncher"

const mockUseEnabledVerticals = jest.fn()
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => mockUseEnabledVerticals(),
}))
// WS-1's workspace_direction_setting switch, held OFF: these menus are the
// switch-off contract, unchanged.
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => false,
}))

function setEnabled(list: string[] | undefined) {
  mockUseEnabledVerticals.mockReturnValue({ data: list, isLoading: false })
}

/**
 * The byte-identical default: with no `career-discovery` entitlement, no menu
 * changes for anyone. Discovery is a workspace vertical — OUT of the Tools
 * catalogue (which managers, practitioners and super-admins see) and in a
 * person's own menu ONLY when entitled.
 */
const EXISTING = ["grant", "honor", "job-blueprint", "job-fit", "knowledge-continuity", "lumen", "direction-setting"]
// The Tools catalogue as it was before DISC-1: every registered vertical except
// the workspace one (job-fit) and the hidden one (honor), sorted by key.
const PRE_DISC1_TOOLS = [
  "/vertical/direction-setting/journey",
  "/vertical/grant/dashboard",
  "/vertical/job-blueprint/dashboard",
  "/vertical/knowledge-continuity/dashboard",
  "/vertical/lumen/dashboard",
]
const CASES: (string[] | undefined)[] = [[], ["job-fit"], EXISTING, undefined]

describe("menus without the entitlement are unchanged", () => {
  test("Discovery is a workspace vertical", () => {
    expect(WORKSPACE_VERTICALS.has("career-discovery")).toBe(true)
  })

  test.each(CASES.map((c) => [c]))("Tools is exactly the pre-DISC-1 catalogue (%p)", (list) => {
    setEnabled(list)
    const { result } = renderHook(() => useVerticalLauncherSection())
    const tos = (result.current?.items ?? []).map((i) => i.to)
    expect(tos).toEqual(PRE_DISC1_TOOLS)
  })

  test.each(CASES.map((c) => [c]))("the workspace menu gains nothing (%p)", (list) => {
    setEnabled(list)
    const { result } = renderHook(() => useWorkspaceVerticalItems())
    expect(result.current.map((i) => i.to)).toEqual(
      (list ?? []).includes("job-fit") ? ["/vertical/job-fit/matches"] : []
    )
  })

  test("an entitled account gets exactly one Discovery row in its own menu", () => {
    setEnabled(["career-discovery"])
    const { result } = renderHook(() => useWorkspaceVerticalItems())
    expect(result.current).toHaveLength(1)
    expect(result.current[0].to).toBe("/vertical/career-discovery/journey")
    expect(result.current[0].disabled).toBe(false)
  })
})
