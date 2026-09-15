/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import "@testing-library/jest-dom"

import { BehavioralProfilePanel } from "../BehavioralProfilePanel"
import type { BehavioralProfile, PrismDimension } from "@/types/development"

const prism: PrismDimension[] = [
  { id: 1, label: "Innovating", score: 80, quadrant: 1 },
  { id: 2, label: "Initiating", score: 65, quadrant: 1 },
  { id: 3, label: "Supporting", score: 55, quadrant: 3 },
  { id: 4, label: "Coordinating", score: 70, quadrant: 3 },
  { id: 5, label: "Focusing", score: 60, quadrant: 4 },
  { id: 6, label: "Delivering", score: 75, quadrant: 4 },
  { id: 7, label: "Finishing", score: 50, quadrant: 2 },
  { id: 8, label: "Evaluating", score: 68, quadrant: 2 },
]

const fullProfile: BehavioralProfile = {
  prism,
  clifton: [
    { name: "Achiever", rank: 1, domain: "executing" },
    { name: "Woo", rank: 2, domain: "influencing" },
  ],
  disc: { d: 70, i: 55, s: 40, c: 65, primaryStyle: "D", adaptedStyle: "DC" },
  reconciliation: {
    headline: "Structured innovator",
    throughLine: "Combines ideation with disciplined follow-through.",
    discrepancies: ["DISC reads lower on steadiness than PRISM suggests"],
    confidence: "high",
    actionableInsights: ["Give autonomy on the how, clarity on the what."],
  },
  coverage: {
    prism: true,
    clifton: true,
    disc: true,
    prismAssessedAt: "2026-06-01",
  },
}

describe("BehavioralProfilePanel", () => {
  it("renders the PRISM text-equivalent table with all 8 dimensions", () => {
    render(<BehavioralProfilePanel profile={fullProfile} />)
    // Text equivalent of the radar (accessibility)
    expect(screen.getByText("Innovating")).toBeInTheDocument()
    expect(screen.getByText("Evaluating")).toBeInTheDocument()
    // Scores rendered in the table
    expect(screen.getByText("80")).toBeInTheDocument()
    // Reconciliation
    expect(screen.getByText("Structured innovator")).toBeInTheDocument()
    expect(screen.getByText(/How to work with this person/i)).toBeInTheDocument()
  })

  it("degraded (PRISM-only) path: renders Invite-to-add cards and a reduced-resolution note", () => {
    const prismOnly: BehavioralProfile = {
      prism,
      reconciliation: {
        headline: "Emerging profile",
        throughLine: "PRISM only — overlays not yet added.",
        discrepancies: [],
        confidence: "low",
      },
      coverage: { prism: true, clifton: false, disc: false },
    }
    render(<BehavioralProfilePanel profile={prismOnly} />)
    // PRISM table still renders
    expect(screen.getByText("Innovating")).toBeInTheDocument()
    // Missing overlays render as invite-to-add cards
    expect(screen.getByText(/Invite to add CliftonStrengths/i)).toBeInTheDocument()
    expect(screen.getByText(/Invite to add DISC/i)).toBeInTheDocument()
    // Reconciliation confidence reduced note
    expect(screen.getByText(/reduced resolution/i)).toBeInTheDocument()
  })

  it("no-PRISM path renders a PRISM invite card instead of the radar/table", () => {
    const noPrism: BehavioralProfile = {
      prism: [],
      reconciliation: {
        headline: "No behavioral data",
        throughLine: "Invite to complete PRISM.",
        discrepancies: [],
        confidence: "low",
      },
      coverage: { prism: false, clifton: false, disc: false },
    }
    render(<BehavioralProfilePanel profile={noPrism} />)
    expect(screen.getByText(/Invite to add PRISM/i)).toBeInTheDocument()
  })
})

// ── TDS-1b: the member withheld their PRISM ──────────────────────────────

describe("BehavioralProfilePanel — not shared (TDS-1b)", () => {
  // The redaction empties `prism` but PRESERVES `coverage.prism`, because
  // whether a PRISM EXISTS is not the secret. This is that exact payload.
  const redacted: BehavioralProfile = {
    prism: [],
    reconciliation: {
      headline: "",
      throughLine: "",
      discrepancies: [],
      confidence: "low",
    },
    coverage: { prism: true, clifton: false, disc: false },
  }

  it("says the profile is withheld, not that there is none", () => {
    render(<BehavioralProfilePanel profile={redacted} notShared memberName="Gary Burnette" />)
    expect(screen.getByTestId("prism-state-not-shared")).toBeInTheDocument()
    expect(screen.getByText(/has a PRISM profile on file but has not shared it/i)).toBeInTheDocument()
  })

  it("never offers to invite a member who already completed PRISM", () => {
    // The defect this branch exists to prevent: with `prism: []` and
    // `coverage.prism: true`, the ordinary path renders an invite to complete
    // an assessment the member sat years ago. False, and its own call to
    // action cannot fix it.
    render(<BehavioralProfilePanel profile={redacted} notShared memberName="Gary Burnette" />)
    expect(screen.queryByText(/Invite to complete PRISM/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId("prism-radar")).not.toBeInTheDocument()
  })

  it("offers the ask, and asking is not granting", () => {
    const onRequestAccess = jest.fn()
    render(
      <BehavioralProfilePanel
        profile={redacted}
        notShared
        memberName="Gary Burnette"
        onRequestAccess={onRequestAccess}
      />,
    )
    const btn = screen.getByRole("button", { name: /Ask to see this profile/i })
    btn.click()
    expect(onRequestAccess).toHaveBeenCalledTimes(1)
    // No scores appear as a result of asking.
    expect(screen.queryByTestId("prism-radar")).not.toBeInTheDocument()
  })

  it("after asking, reports that the member decides", () => {
    render(
      <BehavioralProfilePanel profile={redacted} notShared memberName="Gary Burnette" requestSent />,
    )
    expect(screen.getByTestId("prism-request-sent")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Ask to see this profile/i })).not.toBeInTheDocument()
  })

  it("renders the real profile untouched when the grant is live", () => {
    render(<BehavioralProfilePanel profile={fullProfile} />)
    expect(screen.queryByTestId("prism-state-not-shared")).not.toBeInTheDocument()
    expect(screen.getByText("Structured innovator")).toBeInTheDocument()
  })
})

