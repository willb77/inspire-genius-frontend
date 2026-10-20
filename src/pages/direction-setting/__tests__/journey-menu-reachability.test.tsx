/**
 * @jest-environment jsdom
 *
 * Every stage the Journey map can send you to is also in the Direction Setting
 * menu, in journey order.
 *
 * Salary (stage 4) and Alignment (stage 6) were routed but reachable only from
 * a Journey-map tile, so someone working the menu never saw them. The menu list
 * (`DIRECTION_SETTING_TOOLS`) feeds both the in-page pill row and the left-rail
 * section, so this one list is what a person can navigate by.
 *
 * The map's stage → route table is read from the page's BEHAVIOUR — each tile is
 * clicked and the navigation recorded — rather than exported from the page, so
 * the test cannot drift from what the page actually does and the page's runtime
 * is untouched.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ROUTES } from "@/constants/routes"
import { DIRECTION_SETTING_TOOLS } from "@/constants/vertical-subnav"

const mockGetJourney = jest.fn()
jest.mock("@/services/direction-setting/journey.service", () => ({
  getJourney: (...a: unknown[]) => mockGetJourney(...a),
  advanceJourney: jest.fn(),
  generateJourneyReport: jest.fn(),
  resetJourney: jest.fn(),
  getCareerAreas: jest.fn(),
  getStages: jest.fn(),
}))

const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}))

import JourneyPage from "@/pages/direction-setting/JourneyPage"

/**
 * Stage targets deliberately NOT in the menu. Establish (stages 0–1) is the
 * one-time landing step; the map's next-action sends a new user there, and it
 * has never been a menu entry. Listed by name so adding it to the menu, or the
 * map dropping it, is a visible decision rather than a silent one.
 */
const MAP_ONLY_TARGETS = new Set<string>([ROUTES.DIRECTION_SETTING.ESTABLISH])

/** More ids than the backend serves today, so a new stage is probed too. */
const PROBE_IDS = Array.from({ length: 20 }, (_, i) => String(i))

const stage = (id: string) => ({
  id,
  name: `Stage ${id}`,
  question: `q${id}`,
  outcome: `o${id}`,
  needs: [],
  unmetNeeds: [],
  reachable: true,
  optional: false,
  state: "not_started",
})

/** stage id → route, as the rendered map navigates. */
async function stageRoutesFromMap(): Promise<Map<string, string>> {
  mockGetJourney.mockResolvedValue({
    data: {
      userId: "u1",
      stage: 0,
      status: "in_progress",
      stageStatus: {},
      stages: PROBE_IDS.map(stage),
      // Named apart from every tile so getByText below finds the tile only.
      nextAction: { ...stage("3"), name: "Next up" },
      artefactKeys: [],
      createdAt: null,
      updatedAt: null,
    },
  })
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <JourneyPage />
    </QueryClientProvider>
  )
  await screen.findByText("Stage 0")

  const routes = new Map<string, string>()
  for (const id of PROBE_IDS) {
    mockNavigate.mockClear()
    const tile = screen.getByText(`Stage ${id}`).closest("button")
    expect(tile).not.toBeNull()
    fireEvent.click(tile as HTMLElement)
    const call = mockNavigate.mock.calls[0]
    if (call) routes.set(id, call[0] as string)
  }
  return routes
}

describe("Direction Setting menu covers the Journey map", () => {
  test("the probe is not vacuous: the map navigates for the known stages", async () => {
    const routes = await stageRoutesFromMap()
    // Stages 0–12 are served today. Fewer recorded routes would mean the tile
    // click stopped navigating and every assertion below would pass on nothing.
    expect(routes.size).toBeGreaterThanOrEqual(13)
    expect(routes.get("4")).toBe(ROUTES.DIRECTION_SETTING.SALARY)
    expect(routes.get("6")).toBe(ROUTES.DIRECTION_SETTING.ALIGNMENT)
  })

  test("every stage target is in the menu (except the named map-only ones)", async () => {
    const routes = await stageRoutesFromMap()
    const menu = new Set(DIRECTION_SETTING_TOOLS.map((t) => t.to))
    const missing = [...new Set(routes.values())].filter(
      (to) => !MAP_ONLY_TARGETS.has(to) && !menu.has(to)
    )
    expect(missing).toEqual([])
  })

  test("the map-only exemptions are still real map targets", async () => {
    // Otherwise the exemption list goes stale and hides nothing, silently.
    const targets = new Set((await stageRoutesFromMap()).values())
    for (const to of MAP_ONLY_TARGETS) expect(targets.has(to)).toBe(true)
  })

  test("menu stage entries are in journey order, after the map itself", async () => {
    const routes = await stageRoutesFromMap()
    const firstStage = new Map<string, number>()
    for (const [id, to] of routes) {
      const n = Number(id)
      if (!firstStage.has(to) || n < (firstStage.get(to) as number))
        firstStage.set(to, n)
    }
    expect(DIRECTION_SETTING_TOOLS[0].to).toBe(ROUTES.DIRECTION_SETTING.JOURNEY)
    const order = DIRECTION_SETTING_TOOLS.filter((t) => firstStage.has(t.to)).map(
      (t) => firstStage.get(t.to) as number
    )
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  test("labels and targets are unique (the rail and pill row key by them)", () => {
    const labels = DIRECTION_SETTING_TOOLS.map((t) => t.label)
    const tos = DIRECTION_SETTING_TOOLS.map((t) => t.to)
    expect(new Set(labels).size).toBe(labels.length)
    expect(new Set(tos).size).toBe(tos.length)
  })

  test("Salary and Alignment carry the agreed labels, in place", () => {
    const at = (to: string) => DIRECTION_SETTING_TOOLS.findIndex((t) => t.to === to)
    const ds = ROUTES.DIRECTION_SETTING
    expect(DIRECTION_SETTING_TOOLS[at(ds.SALARY)].label).toBe("What it pays")
    expect(DIRECTION_SETTING_TOOLS[at(ds.ALIGNMENT)].label).toBe("Goals vs wiring")
    expect(at(ds.CAREERS) + 1).toBe(at(ds.SALARY))
    expect(at(ds.SALARY) + 1).toBe(at(ds.GOALS))
    expect(at(ds.GOALS) + 1).toBe(at(ds.ALIGNMENT))
    expect(at(ds.ALIGNMENT) + 1).toBe(at(ds.MATCHES))
  })
})
