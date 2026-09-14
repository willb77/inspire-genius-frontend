/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import { TeamComparePanel } from "../TeamComparePanel"
import { TEAM_STUDIO_COMPARE_COPY } from "../studioCopy"
import type { ComparePort, CompareCopy, SubjectListPort } from "@/components/prism/studio/ports"

// The binding is the only thing under test: the cast it hands the port, the
// words it hands the shared panel, and what it says about who was left out.
// The cast hook is mocked (it reads the roster); the compare hook is REAL so
// the test proves the port the panel receives is built from this cast.
const castPort: SubjectListPort = {
  subjects: [{ id: "m-1", name: "Ada", source: "", notes: "", has_analysis: false, created_at: null, updated_at: null }],
  isLoading: false,
}
const resolve = jest.fn(async () => [])
let withoutPrism = 0

jest.mock("@/hooks/manager/development/useStudioCast", () => ({
  useStudioCast: () => ({ port: castPort, resolve, withoutPrism }),
}))

const received: { port?: ComparePort; copy?: CompareCopy } = {}
jest.mock("@/components/prism/studio/ComparePanel", () => ({
  __esModule: true,
  default: ({ port, copy }: { port: ComparePort; copy: CompareCopy }) => {
    received.port = port
    received.copy = copy
    return <div data-testid="compare-panel" />
  },
}))

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TeamComparePanel />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  withoutPrism = 0
  received.port = undefined
  received.copy = undefined
})

describe("TeamComparePanel", () => {
  it("hands the shared panel a port whose cast is the team, and the team's words", () => {
    renderPanel()
    expect(screen.getByTestId("compare-panel")).toBeInTheDocument()
    expect(received.port?.cast).toBe(castPort)
    expect(received.copy).toBe(TEAM_STUDIO_COMPARE_COPY)
    expect(received.copy?.groupNoun).toBe("your team")
  })

  it("exposes compare, questions and ask on the port", () => {
    renderPanel()
    expect(received.port?.compare).toBeDefined()
    expect(received.port?.questions).toBeDefined()
    expect(received.port?.ask).toBeDefined()
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
    withoutPrism = 3
    renderPanel()
    expect(screen.getByText(/3 team members are not listed — they have no PRISM on file/i)).toBeInTheDocument()
  })
})
