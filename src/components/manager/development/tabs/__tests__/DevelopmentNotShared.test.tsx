/** @jest-environment jsdom */
/**
 * S-7 prep — a development tab that could not show its data says why, and
 * never says "none" in that case.
 *
 * CSA F8: a 403 on `GET /gaps` rendered "No gaps identified against this
 * target", because the query's error was dropped and `undefined` read as an
 * empty list. These pin each of the three states apart from the empty one.
 */
import fs from "fs"
import path from "path"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import { GapAnalysisPanel } from "../GapAnalysisPanel"
import { LearningPlanPanel } from "../LearningPlanPanel"
import type { CareerMatch, DevelopmentGap } from "@/types/development"
import { getGapAnalysis } from "@/services/manager/development/growthService"

jest.mock("@/services/manager/development/growthService", () => ({
  ...jest.requireActual("@/services/manager/development/growthService"),
  getGapAnalysis: jest.fn(),
}))
const mockGaps = getGapAnalysis as jest.MockedFunction<typeof getGapAnalysis>

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

const matches: CareerMatch[] = [
  {
    matchId: "cm-1",
    memberId: "m-1",
    kind: "internal",
    title: "Senior CSM",
    blueprintId: "bp-1",
    fitScore: 82,
    classification: "strong_fit",
    rationale: "r",
  },
]

const gap: DevelopmentGap = {
  gapId: "gap-1",
  memberId: "m-1",
  competency: "Delegation",
  currentLevel: 2,
  targetLevel: 4,
  severity: "moderate",
  source: "behavioral",
  status: "open",
}

const axios403 = { isAxiosError: true, response: { status: 403, data: { detail: "no" } } }
const axios500 = { isAxiosError: true, response: { status: 500, data: {} } }
const ok = (data: DevelopmentGap[]) =>
  ({ data: { success: true, data } }) as unknown as Awaited<ReturnType<typeof getGapAnalysis>>

const NONE = /No gaps identified/i

describe("GapAnalysisPanel — S-7 states", () => {
  beforeEach(() => mockGaps.mockReset())

  it("a 403 says not shared, never 'no gaps'", async () => {
    mockGaps.mockRejectedValue(axios403)
    renderWith(<GapAnalysisPanel memberId="m-1" matches={matches} />)
    expect(await screen.findByTestId("gaps-not-shared")).toBeInTheDocument()
    expect(screen.queryByText(NONE)).not.toBeInTheDocument()
  })

  it("any other failure says couldn't load, never 'no gaps'", async () => {
    mockGaps.mockRejectedValue(axios500)
    renderWith(<GapAnalysisPanel memberId="m-1" matches={matches} />)
    expect(await screen.findByTestId("gaps-unavailable")).toHaveAttribute("role", "status")
    expect(screen.queryByText(NONE)).not.toBeInTheDocument()
    expect(screen.queryByTestId("gaps-not-shared")).not.toBeInTheDocument()
  })

  it("the dossier's notShared wins even over a successful list", async () => {
    mockGaps.mockResolvedValue(ok([gap]))
    renderWith(<GapAnalysisPanel memberId="m-1" matches={matches} notShared />)
    expect(await screen.findByTestId("gaps-not-shared")).toBeInTheDocument()
    expect(screen.queryByText("Delegation")).not.toBeInTheDocument()
  })

  it("a successful empty list still says none", async () => {
    mockGaps.mockResolvedValue(ok([]))
    renderWith(<GapAnalysisPanel memberId="m-1" matches={matches} />)
    expect(await screen.findByText(NONE)).toBeInTheDocument()
  })

  it("a successful list still renders its gaps", async () => {
    mockGaps.mockResolvedValue(ok([gap]))
    renderWith(<GapAnalysisPanel memberId="m-1" matches={matches} />)
    expect(await screen.findByText("Delegation")).toBeInTheDocument()
  })
})

describe("LearningPlanPanel — S-7 states", () => {
  const NONE_YET = /No learning items yet/i

  it("notShared says not shared, never 'none yet'", () => {
    renderWith(<LearningPlanPanel memberId="m-1" learning={[]} gaps={[]} goals={[]} notShared />)
    expect(screen.getByTestId("learning-not-shared")).toBeInTheDocument()
    expect(screen.queryByText(NONE_YET)).not.toBeInTheDocument()
  })

  it("a missing list says couldn't load, never 'none yet'", () => {
    renderWith(<LearningPlanPanel memberId="m-1" learning={undefined} gaps={[]} goals={[]} />)
    expect(screen.getByTestId("learning-unavailable")).toHaveAttribute("role", "status")
    expect(screen.queryByText(NONE_YET)).not.toBeInTheDocument()
  })

  it("an empty list that arrived still says none yet", () => {
    renderWith(<LearningPlanPanel memberId="m-1" learning={[]} gaps={[]} goals={[]} />)
    expect(screen.getByText(NONE_YET)).toBeInTheDocument()
  })
})

describe("MemberDevelopmentWorkspace — S-7 wiring", () => {
  // Static: the workspace needs a dossier, agents and routing to render, and
  // the failure this guards is silent — a panel left without `notShared` falls
  // back to "none yet" and renders perfectly well.
  const src = fs.readFileSync(
    path.resolve(__dirname, "../../../../../pages/manager/development/MemberDevelopmentWorkspace.tsx"),
    "utf8",
  )

  it.each(["GapAnalysisPanel", "LearningPlanPanel"])("%s receives the dossier's notShared", (panel) => {
    const open = src.indexOf(`<${panel}`)
    expect(open).toBeGreaterThan(-1)
    const tag = src.slice(open, src.indexOf("/>", open))
    expect(tag).toMatch(/notShared=\{dossier\.developmentNotShared\}/)
  })
})
