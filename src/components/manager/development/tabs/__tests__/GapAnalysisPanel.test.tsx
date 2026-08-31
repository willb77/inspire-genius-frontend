/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import { GapAnalysisPanel } from "../GapAnalysisPanel"
import type { CareerMatch } from "@/types/development"

// agentApi is globally mocked in jest.setup (getApi().get rejects), so the
// gap query resolves to its empty fallback — the disclaimer must still render.

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
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
    rationale: "Strong behavioral alignment with the role profile.",
  },
]

describe("GapAnalysisPanel", () => {
  it("always shows the development-input (not a selection decision) disclaimer", () => {
    renderWith(<GapAnalysisPanel memberId="m-1" matches={matches} />)
    expect(
      screen.getByText(/development input, not a selection decision/i),
    ).toBeInTheDocument()
  })

  it("renders the James fit-classification banner for the selected target", () => {
    renderWith(<GapAnalysisPanel memberId="m-1" matches={matches} />)
    expect(screen.getByText(/James assessment: Strong fit/i)).toBeInTheDocument()
  })

  it("still renders the disclaimer when there are no target roles", () => {
    renderWith(<GapAnalysisPanel memberId="m-1" matches={[]} />)
    expect(
      screen.getByText(/development input, not a selection decision/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/No target roles available yet/i)).toBeInTheDocument()
  })
})
