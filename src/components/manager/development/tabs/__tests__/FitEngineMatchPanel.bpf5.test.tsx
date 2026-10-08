/** @jest-environment jsdom */
/**
 * BP-F5 — the manager's Careers tab and roster line on a partial-profile
 * member. blueprint-service now leaves a dimension the member was never
 * measured on out of the score (it used to count as 0); growth copies the
 * counts through, and the manager must be able to read "8 of 22 measured"
 * beside the number — with still no tier, band or classification.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import "@testing-library/jest-dom"
import { FitEngineMatchPanel } from "../FitEngineMatchPanel"
import { fitMatchCoverage, partialMatchesMessage } from "../fitEngineMatchCopy"
import type { MemberFitMatches, RosterMember } from "@/types/development"

let mockHookData: MemberFitMatches | undefined
jest.mock("@/constants/development", () => ({
  ...jest.requireActual("@/constants/development"),
  FIT_ENGINE_MATCHES_ENABLED: true,
}))
jest.mock("@/hooks/manager/development/useMemberFitMatches", () => ({
  useMemberFitMatches: () => ({ data: mockHookData }),
}))

import { MemberCard } from "../../MemberCard"

const PARTIAL: MemberFitMatches = {
  state: "ok",
  matches: [
    { rank: 1, roleTitle: "Field Service Engineer", jobId: "j1", fitScore: 92, dimensionsEvaluated: 8, dimensionsTotal: 22 },
    { rank: 2, roleTitle: "Planner", jobId: "j2", fitScore: 88, dimensionsEvaluated: 8, dimensionsTotal: 22 },
  ],
  asOf: "2026-10-07T12:00:00+00:00",
  ageDays: 0,
}

const FULL: MemberFitMatches = {
  ...PARTIAL,
  matches: [
    { rank: 1, roleTitle: "Analyst", jobId: "j1", fitScore: 81, dimensionsEvaluated: 22, dimensionsTotal: 22 },
    { rank: 2, roleTitle: "Lead", jobId: "j2", fitScore: 74 }, // pre-BP-F5 row: no counts
  ],
}

describe("fitMatchCoverage", () => {
  it("partial only when fewer than all dimensions were evaluated", () => {
    expect(fitMatchCoverage(PARTIAL.matches[0])).toEqual({ evaluated: 8, total: 22 })
    expect(fitMatchCoverage(FULL.matches[0])).toBeNull()
    expect(fitMatchCoverage(FULL.matches[1])).toBeNull()
    expect(fitMatchCoverage({ ...FULL.matches[1], dimensionsEvaluated: 8 })).toBeNull()
    expect(fitMatchCoverage({ ...FULL.matches[1], dimensionsEvaluated: 0, dimensionsTotal: 0 })).toBeNull()
  })
})

describe("FitEngineMatchPanel — BP-F5", () => {
  it("labels each partial score and explains once, with no tier", () => {
    const { container } = render(<FitEngineMatchPanel memberName="Ada" result={PARTIAL} />)
    expect(screen.getAllByTestId("fit-match-coverage")).toHaveLength(2)
    expect(screen.getAllByTestId("fit-match-coverage")[0]).toHaveTextContent("8 of 22 measured")
    const note = screen.getByTestId("fit-matches-partial")
    expect(note).toHaveTextContent(partialMatchesMessage("Ada", { evaluated: 8, total: 22 }))
    expect(note).toHaveTextContent(/no overall fit rating is given/)
    expect(container.textContent).not.toMatch(/misalignment|strong[ -]fit|potential[ -]fit|excellent|poor/i)
  })

  it("a full (or pre-BP-F5) list shows no coverage label and no note", () => {
    render(<FitEngineMatchPanel memberName="Ada" result={FULL} />)
    expect(screen.queryByTestId("fit-match-coverage")).not.toBeInTheDocument()
    expect(screen.queryByTestId("fit-matches-partial")).not.toBeInTheDocument()
  })
})

describe("MemberCard roster line — BP-F5", () => {
  const member: RosterMember = {
    memberId: "m-1",
    name: "Jordan Rivera",
    coverage: { prism: true, clifton: false, disc: false },
    planStatus: "on_track",
  } as RosterMember

  function renderCard() {
    return render(
      <MemoryRouter>
        <MemberCard member={member} />
      </MemoryRouter>,
    )
  }

  it("shows the partial count beside the rank-1 score", () => {
    mockHookData = PARTIAL
    renderCard()
    expect(screen.getByTestId("member-card-top-match")).toHaveTextContent("92%")
    expect(screen.getByTestId("member-card-top-match-coverage")).toHaveTextContent("8/22")
  })

  it("no count for a full profile", () => {
    mockHookData = FULL
    renderCard()
    expect(screen.getByTestId("member-card-top-match")).toHaveTextContent("81%")
    expect(screen.queryByTestId("member-card-top-match-coverage")).not.toBeInTheDocument()
  })
})
