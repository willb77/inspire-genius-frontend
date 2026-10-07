import { render, screen } from "@testing-library/react"
import { FitEngineMatchPanel } from "../FitEngineMatchPanel"
import { fitStateMessage, formatAsOf } from "../fitEngineMatchCopy"
import type { MemberFitMatches } from "@/types/development"

const OK: MemberFitMatches = {
  state: "ok",
  matches: [
    { rank: 1, roleTitle: "Operations Analyst", jobId: "j1", fitScore: 81 },
    { rank: 2, roleTitle: "Team Lead", jobId: "j2", fitScore: 73.6 },
  ],
  asOf: "2026-10-01T12:00:00+00:00",
  ageDays: 5,
}

const EMPTY_STATES = [
  "no_account", "not_shared", "no_prism", "not_entitled", "no_snapshot", "unavailable",
] as const

describe("FitEngineMatchPanel (3.3a) — every state says what it means", () => {
  it.each(EMPTY_STATES)("%s renders its own sentence and no list", (state) => {
    render(
      <FitEngineMatchPanel
        memberName="Ada"
        result={{ state, matches: [], asOf: null, ageDays: null }}
      />,
    )
    const card = screen.getByTestId(`fit-matches-${state}`)
    expect(card).toHaveTextContent(fitStateMessage(state, "Ada"))
    expect(screen.queryByTestId("fit-match-item")).not.toBeInTheDocument()
    for (const other of EMPTY_STATES.filter((s) => s !== state)) {
      expect(screen.queryByTestId(`fit-matches-${other}`)).not.toBeInTheDocument()
    }
  })

  it("gives each state a distinct sentence", () => {
    const texts = EMPTY_STATES.map((s) => fitStateMessage(s, "Ada"))
    expect(new Set(texts).size).toBe(EMPTY_STATES.length)
    expect(fitStateMessage("no_snapshot", "Ada")).toMatch(/hasn't run My fit yet/)
    expect(fitStateMessage("not_shared", "Ada")).toMatch(/hasn't shared their PRISM/)
  })

  it("unavailable is an alert and never presented as 'none'", () => {
    render(<FitEngineMatchPanel memberName="Ada" error />)
    const card = screen.getByTestId("fit-matches-unavailable")
    expect(card).toHaveAttribute("role", "alert")
    expect(card).toHaveTextContent(/isn't the same as having none/)
  })

  it("a missing result reads as unavailable, not as no matches", () => {
    render(<FitEngineMatchPanel memberName="Ada" />)
    expect(screen.getByTestId("fit-matches-unavailable")).toBeInTheDocument()
  })

  it("ok lists rank, role and score, with the as-of line", () => {
    render(<FitEngineMatchPanel memberName="Ada" result={OK} />)
    const items = screen.getAllByTestId("fit-match-item")
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent("#1Operations Analyst")
    expect(items[0]).toHaveTextContent("81%")
    expect(items[1]).toHaveTextContent("74%")
    expect(screen.getByTestId("fit-matches-as-of")).toHaveTextContent(
      `From Ada’s own My fit, as of ${formatAsOf(OK.asOf)}.`,
    )
  })

  it("shows no tier, band or classification and offers no gap actions", () => {
    render(<FitEngineMatchPanel memberName="Ada" result={OK} />)
    const text = document.body.textContent ?? ""
    for (const word of [
      "Strong fit", "Potential fit", "Misalignment", "Moderate", "strong-fit", "Excellent", "Poor",
    ]) {
      expect(text).not.toContain(word)
    }
    expect(screen.queryByRole("button", { name: /Set as target/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /View gaps/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: /internal/i })).not.toBeInTheDocument()
  })

  it("ok with zero roles says so rather than rendering nothing", () => {
    render(<FitEngineMatchPanel memberName="Ada" result={{ ...OK, matches: [] }} />)
    expect(screen.getByTestId("fit-matches-no-roles")).toBeInTheDocument()
  })

  it("loading shows the loading line only", () => {
    render(<FitEngineMatchPanel memberName="Ada" loading />)
    expect(screen.getByText("Loading matches…")).toBeInTheDocument()
    expect(screen.queryByTestId("fit-matches-unavailable")).not.toBeInTheDocument()
  })

  it("formatAsOf tolerates null and junk", () => {
    expect(formatAsOf(null)).toBeNull()
    expect(formatAsOf("not a date")).toBeNull()
    expect(formatAsOf("2026-10-01T12:00:00Z")).toBeTruthy()
  })
})
