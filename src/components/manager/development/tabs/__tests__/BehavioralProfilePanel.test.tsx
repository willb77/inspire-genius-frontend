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
