/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import { TeamScenarioPanel } from "../TeamScenarioPanel"
import { TEAM_STUDIO_SCENARIO_COPY } from "../studioCopy"
import type { ScenarioPort, ScenarioCopy, SubjectListPort } from "@/components/prism/studio/ports"

// As for the compare binding: the cast hook is mocked, the scenario hook is
// real, and the shared panel is a probe that records what it was given.
const castPort: SubjectListPort = {
  subjects: [{ id: "m-1", name: "Ada", source: "", notes: "", has_analysis: false, created_at: null, updated_at: null }],
  isLoading: false,
}
const resolve = jest.fn(async () => [])
let withoutPrism = 0

jest.mock("@/hooks/manager/development/useStudioCast", () => ({
  useStudioCast: () => ({ port: castPort, resolve, withoutPrism }),
}))

const received: { port?: ScenarioPort; copy?: ScenarioCopy } = {}
jest.mock("@/components/prism/studio/ScenarioPanel", () => ({
  __esModule: true,
  default: ({ port, copy }: { port: ScenarioPort; copy: ScenarioCopy }) => {
    received.port = port
    received.copy = copy
    return <div data-testid="scenario-panel" />
  },
}))

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TeamScenarioPanel />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  withoutPrism = 0
  received.port = undefined
  received.copy = undefined
})

describe("TeamScenarioPanel", () => {
  it("hands the shared panel a port whose cast is the team, and the team's words", () => {
    renderPanel()
    expect(screen.getByTestId("scenario-panel")).toBeInTheDocument()
    expect(received.port?.cast).toBe(castPort)
    expect(received.port?.run).toBeDefined()
    expect(received.copy).toBe(TEAM_STUDIO_SCENARIO_COPY)
  })

  it("passes no scenario store, so the panel offers no 'Keep this run' that saves nothing", () => {
    renderPanel()
    expect(received.port).toBeDefined()
    expect(received.port?.store).toBeUndefined()
  })

  it("says nothing about exclusions when everyone has PRISM on file", () => {
    renderPanel()
    expect(screen.queryByText(/not listed/i)).not.toBeInTheDocument()
  })

  it("says out loud that one member is not listed, in the singular", () => {
    withoutPrism = 1
    renderPanel()
    expect(screen.getByText(/1 team member is not listed — they have no PRISM on file/i)).toBeInTheDocument()
  })

  it("says out loud that several members are not listed, in the plural", () => {
    withoutPrism = 2
    renderPanel()
    expect(screen.getByText(/2 team members are not listed — they have no PRISM on file/i)).toBeInTheDocument()
  })
})
