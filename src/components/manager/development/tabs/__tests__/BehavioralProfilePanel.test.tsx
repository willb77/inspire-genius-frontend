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

  it("offers no ask when the member has no account — there is nobody to answer", () => {
    // The seven Studio-added rows on staging-b are exactly this case. A button
    // here would report "Asked. They decide" for a request that reaches no
    // human: consent/people.py matches a roster manager on
    // `member_id = :caller`, and a synthetic id never equals a real sub.
    const onRequestAccess = jest.fn()
    render(
      <BehavioralProfilePanel
        profile={redacted}
        notShared
        noAccount
        memberName="Paula Averico"
        onRequestAccess={onRequestAccess}
      />,
    )
    expect(screen.getByTestId("prism-state-no-account")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Ask to see this profile/i })).not.toBeInTheDocument()
    expect(onRequestAccess).not.toHaveBeenCalled()
  })

  it("renders the real profile untouched when the grant is live", () => {
    render(<BehavioralProfilePanel profile={fullProfile} />)
    expect(screen.queryByTestId("prism-state-not-shared")).not.toBeInTheDocument()
    expect(screen.getByText("Structured innovator")).toBeInTheDocument()
  })
})

describe("BehavioralProfilePanel — withheld vs none on file", () => {
  // Both fixtures are redacted payloads: `prism` empty, `notShared` true.
  // They differ ONLY in `coverage.prism`, which the redaction preserves on
  // purpose. Every not-shared test above sets it true, which is how the panel
  // shipped asserting a profile exists for members who have none — with zero
  // live `prism` grants, that was every member without a PRISM.
  const base = {
    prism: [],
    reconciliation: {
      headline: "",
      throughLine: "",
      discrepancies: [],
      confidence: "low" as const,
    },
  }
  const withheld: BehavioralProfile = { ...base, coverage: { prism: true, clifton: false, disc: false } }
  const noneOnFile: BehavioralProfile = { ...base, coverage: { prism: false, clifton: false, disc: false } }

  it("does not claim a profile exists when none does", () => {
    render(<BehavioralProfilePanel profile={noneOnFile} notShared memberName="Paula Averico" />)
    expect(screen.queryByText(/has a PRISM profile on file/i)).not.toBeInTheDocument()
    expect(screen.getByText(/has no PRISM profile on file/i)).toBeInTheDocument()
  })

  it("offers no ask when there is nothing to ask for", () => {
    const onRequestAccess = jest.fn()
    render(
      <BehavioralProfilePanel
        profile={noneOnFile}
        notShared
        memberName="Paula Averico"
        onRequestAccess={onRequestAccess}
      />,
    )
    expect(screen.getByTestId("prism-state-none-on-file")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /ask to see this profile/i })).not.toBeInTheDocument()
    expect(onRequestAccess).not.toHaveBeenCalled()
  })

  // Mutation guard: flipping ONLY coverage.prism must change what is said.
  // Without this pair, a panel that ignores coverage passes every test above.
  it("says something different for the two, from the same emptied scores", () => {
    const { unmount } = render(
      <BehavioralProfilePanel profile={withheld} notShared memberName="Gary Burnette" onRequestAccess={jest.fn()} />,
    )
    expect(screen.getByText(/has a PRISM profile on file/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /ask to see this profile/i })).toBeInTheDocument()
    expect(screen.queryByTestId("prism-state-none-on-file")).not.toBeInTheDocument()
    unmount()

    render(
      <BehavioralProfilePanel profile={noneOnFile} notShared memberName="Gary Burnette" onRequestAccess={jest.fn()} />,
    )
    expect(screen.queryByText(/has a PRISM profile on file/i)).not.toBeInTheDocument()
    expect(screen.getByTestId("prism-state-none-on-file")).toBeInTheDocument()
  })

  it("still reports no account ahead of the ask when the profile does exist", () => {
    render(
      <BehavioralProfilePanel
        profile={withheld}
        notShared
        noAccount
        memberName="Gary Burnette"
        onRequestAccess={jest.fn()}
      />,
    )
    expect(screen.getByTestId("prism-state-no-account")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /ask to see this profile/i })).not.toBeInTheDocument()
  })
})
