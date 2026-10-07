/**
 * @jest-environment jsdom
 *
 * TDS-8 (3.2): one gap engine. Pinned here:
 *  - a row is MEASURED only when `engineVersion` is set — a legacy
 *    `behavioral` row is indicative and loses its level bars;
 *  - every measured-gap state is a sentence, never an empty list;
 *  - in classified mode the list is read unfiltered (coaching rows have no
 *    target), and without `gapsState` the tab renders exactly as before — the
 *    gate that keeps one FE deploy inert on staging-b until its backend promote.
 */
const gapsQuery: { data: unknown[]; isLoading: boolean } = { data: [], isLoading: false }
const gapAnalysisCalls: Array<[string | undefined, string | undefined]> = []

jest.mock("@/hooks/manager/development", () => ({
  useGapAnalysis: (memberId: string | undefined, target: string | undefined) => {
    gapAnalysisCalls.push([memberId, target])
    return gapsQuery
  },
  useCloseGapPlan: () => ({ mutate: jest.fn(), isPending: false }),
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { render, screen, within } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import { GapAnalysisPanel } from "../GapAnalysisPanel"
import type { CareerMatch, DevelopmentGap, GapsState } from "@/types/development"

const matches: CareerMatch[] = [
  {
    matchId: "cm-1",
    memberId: "m-1",
    kind: "internal",
    title: "Senior CSM",
    blueprintId: "bp-1",
    fitScore: 82,
    classification: "strong_fit",
    rationale: "Strong behavioral alignment.",
  },
]

const gap = (over: Partial<DevelopmentGap> = {}): DevelopmentGap => ({
  gapId: "gap-1",
  memberId: "m-1",
  competency: "Delegation",
  currentLevel: 2,
  targetLevel: 4,
  severity: "moderate",
  source: "behavioral",
  status: "open",
  ...over,
})

function renderPanel(props: { gapsState?: GapsState; gapsTargetRole?: string | null } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <GapAnalysisPanel memberId="m-1" matches={matches} {...props} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  gapAnalysisCalls.length = 0
  gapsQuery.isLoading = false
  gapsQuery.data = []
})

describe("without gapsState (an older backend)", () => {
  it("renders the pre-TDS-8 list, levels and all, filtered by the selected target", () => {
    gapsQuery.data = [gap()]
    renderPanel()
    expect(screen.getByText("Current 2")).toBeInTheDocument()
    expect(screen.queryByTestId("gaps-indicative")).not.toBeInTheDocument()
    expect(gapAnalysisCalls.at(-1)).toEqual(["m-1", "bp-1"])
  })
})

describe("with gapsState (a backend that classifies)", () => {
  it("reads the list unfiltered, so coaching rows with no target are not hidden", () => {
    renderPanel({ gapsState: "no_target" })
    expect(gapAnalysisCalls.at(-1)).toEqual(["m-1", undefined])
  })

  it("files a legacy behavioral row as indicative, with no level bars", () => {
    gapsQuery.data = [gap({ engineVersion: null })]
    renderPanel({ gapsState: "no_target" })
    const indicative = screen.getByTestId("gaps-indicative")
    expect(within(indicative).getByText("Delegation")).toBeInTheDocument()
    expect(within(indicative).queryByTestId("gap-levels")).not.toBeInTheDocument()
    expect(within(screen.getByTestId("gaps-measured")).queryByText("Delegation")).not.toBeInTheDocument()
  })

  it("shows measured rows with their levels under the target role when ok", () => {
    gapsQuery.data = [
      gap({ gapId: "m", competency: "Directing", currentLevel: 20, targetLevel: 80, engineVersion: "fit/7" }),
      gap({ gapId: "c", competency: "Listening", source: "coaching", currentLevel: 0, targetLevel: 0, engineVersion: null }),
    ]
    renderPanel({ gapsState: "ok", gapsTargetRole: "Team Lead" })
    const measured = screen.getByTestId("gaps-measured")
    expect(within(measured).getByText("Measured against Team Lead")).toBeInTheDocument()
    expect(within(measured).getByText("Directing")).toBeInTheDocument()
    expect(within(measured).getByText("Current 20")).toBeInTheDocument()
    expect(within(screen.getByTestId("gaps-indicative")).getByText("Listening")).toBeInTheDocument()
  })

  it.each([
    ["not_shared", /hasn't been shared with you/i],
    ["no_account", /no platform account/i],
    ["no_target", /Pick a target role to see measured gaps/i],
    ["no_prism", /no PRISM profile on file/i],
    ["no_fit", /hasn't been scored yet/i],
    ["unavailable", /couldn't be loaded right now/i],
  ] as Array<[GapsState, RegExp]>)("says why nothing is measured: %s", (state, copy) => {
    renderPanel({ gapsState: state })
    expect(screen.getByTestId("gaps-measured-state")).toHaveTextContent(copy)
  })

  it("does not show measured rows written under an earlier grant when the state is no longer ok", () => {
    gapsQuery.data = [gap({ competency: "Directing", engineVersion: "fit/7" })]
    renderPanel({ gapsState: "not_shared" })
    expect(screen.queryByText("Directing")).not.toBeInTheDocument()
  })

  it("says an engine-closed gap closed because the fit moved, not by hand", () => {
    gapsQuery.data = [
      gap({ competency: "Directing", engineVersion: "fit/7", status: "closed", closedReason: "resolved_by_engine" }),
    ]
    renderPanel({ gapsState: "ok", gapsTargetRole: "Team Lead" })
    expect(screen.getByText(/latest fit no longer shows this gap/i)).toBeInTheDocument()
  })

  it("keeps hand-added skill gaps in their own group, with levels", () => {
    gapsQuery.data = [gap({ competency: "Kubernetes", source: "skill", engineVersion: null })]
    renderPanel({ gapsState: "no_target" })
    const skill = screen.getByTestId("gaps-skill")
    expect(within(skill).getByText("Kubernetes")).toBeInTheDocument()
    expect(within(skill).getByTestId("gap-levels")).toBeInTheDocument()
  })

  it("never renders the bare 'No gaps identified' sentence in classified mode", () => {
    renderPanel({ gapsState: "ok", gapsTargetRole: "Team Lead" })
    expect(screen.queryByText(/No gaps identified against this target/i)).not.toBeInTheDocument()
    expect(screen.getByText(/latest fit shows no gaps against this role/i)).toBeInTheDocument()
    expect(screen.getByText(/No coaching suggestions yet/i)).toBeInTheDocument()
  })
})
