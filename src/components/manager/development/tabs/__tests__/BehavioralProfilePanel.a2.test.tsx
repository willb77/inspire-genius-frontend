/** @jest-environment jsdom */
/**
 * TDS A2 — DISC and CliftonStrengths follow the member's `assessments` grant.
 * The server keeps `coverage.<fw>` (whether a result exists is not the secret)
 * and sends no data when the viewer may not see it. The panel must then say
 * "Not shared with you", never "invite to add" an assessment already taken.
 */
import { render, screen, within } from "@testing-library/react"
import "@testing-library/jest-dom"

import { BehavioralProfilePanel } from "../BehavioralProfilePanel"
import type { BehavioralProfile, PrismDimension } from "@/types/development"

const prism: PrismDimension[] = [
  { id: 1, label: "Innovating", score: 80, quadrant: 1 },
  { id: 2, label: "Initiating", score: 65, quadrant: 1 },
]
const recon = { headline: "", throughLine: "", discrepancies: [], confidence: "low" as const }
const clifton = [{ name: "Achiever", rank: 1, domain: "executing" as const }]
const disc = { d: 70, i: 55, s: 40, c: 65, primaryStyle: "D" }

function profile(over: Partial<BehavioralProfile>): BehavioralProfile {
  return {
    prism,
    clifton: null,
    disc: null,
    reconciliation: recon,
    coverage: { prism: true, clifton: false, disc: false },
    ...over,
  } as BehavioralProfile
}

describe("BehavioralProfilePanel — A2 overlays", () => {
  it("today's backend (no DISC/Clifton coverage) renders exactly today's invite cards", () => {
    const onInvite = jest.fn()
    render(<BehavioralProfilePanel profile={profile({})} onInvite={onInvite} memberName="Sam" />)
    expect(screen.getByText("Invite to add CliftonStrengths")).toBeInTheDocument()
    expect(screen.getByText("Invite to add DISC")).toBeInTheDocument()
    expect(screen.queryByTestId("overlay-not-shared-clifton")).toBeNull()
    expect(screen.queryByTestId("overlay-not-shared-disc")).toBeNull()
  })

  it("withheld but on file: says not shared, never invites", () => {
    const onInvite = jest.fn()
    render(
      <BehavioralProfilePanel
        profile={profile({ coverage: { prism: true, clifton: true, disc: true } })}
        onInvite={onInvite}
        memberName="Sam"
      />,
    )
    const c = screen.getByTestId("overlay-not-shared-clifton")
    const d = screen.getByTestId("overlay-not-shared-disc")
    expect(within(c).getByText("Not shared with you")).toBeInTheDocument()
    expect(within(c).getByText(/Sam has a CliftonStrengths result on file/)).toBeInTheDocument()
    expect(within(d).getByText(/Sam has a DISC result on file/)).toBeInTheDocument()
    expect(screen.queryByText(/Invite to add CliftonStrengths/)).toBeNull()
    expect(screen.queryByText(/Invite to add DISC/)).toBeNull()
    // No ask here: that is A3's.
    expect(within(c).queryByRole("button")).toBeNull()
    expect(within(d).queryByRole("button")).toBeNull()
  })

  it("an empty theme list with coverage is also 'not shared', not an invite", () => {
    render(<BehavioralProfilePanel profile={profile({ clifton: [], coverage: { prism: true, clifton: true, disc: false } })} />)
    expect(screen.getByTestId("overlay-not-shared-clifton")).toBeInTheDocument()
    expect(screen.getByText("DISC not on file")).toBeInTheDocument()
  })

  it("shared: renders the data as today", () => {
    render(
      <BehavioralProfilePanel
        profile={profile({ clifton, disc, coverage: { prism: true, clifton: true, disc: true } })}
      />,
    )
    expect(screen.getByText("Achiever")).toBeInTheDocument()
    expect(screen.getByText("D", { selector: "strong" })).toBeInTheDocument()
    expect(screen.queryByTestId("overlay-not-shared-clifton")).toBeNull()
    expect(screen.queryByTestId("overlay-not-shared-disc")).toBeNull()
  })

  it("each overlay is decided on its own", () => {
    render(<BehavioralProfilePanel profile={profile({ clifton, coverage: { prism: true, clifton: true, disc: true } })} />)
    expect(screen.getByText("Achiever")).toBeInTheDocument()
    expect(screen.getByTestId("overlay-not-shared-disc")).toBeInTheDocument()
  })
})

describe("BehavioralProfilePanel — A2 with PRISM withheld", () => {
  it("shared overlays still show when PRISM is not shared (assessments ≠ prism)", () => {
    render(
      <BehavioralProfilePanel
        notShared
        profile={profile({ prism: [], clifton, disc, coverage: { prism: true, clifton: true, disc: true } })}
      />,
    )
    expect(screen.getByTestId("prism-state-not-shared")).toBeInTheDocument()
    expect(screen.getByText("Achiever")).toBeInTheDocument()
    expect(screen.getByText("D", { selector: "strong" })).toBeInTheDocument()
  })

  it("no overlay on file: the PRISM not-shared state is exactly as before", () => {
    render(<BehavioralProfilePanel notShared profile={profile({ prism: [] })} />)
    expect(screen.getByTestId("prism-state-not-shared")).toBeInTheDocument()
    expect(screen.queryByText("CliftonStrengths")).toBeNull()
    expect(screen.queryByText("DISC")).toBeNull()
  })

  it("withheld overlays under a withheld PRISM say not shared", () => {
    render(
      <BehavioralProfilePanel
        notShared
        profile={profile({ prism: [], coverage: { prism: true, clifton: true, disc: false } })}
      />,
    )
    expect(screen.getByTestId("overlay-not-shared-clifton")).toBeInTheDocument()
  })
})
