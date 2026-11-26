/** @jest-environment jsdom */
/**
 * TDS A3 (CSA #2213, option 2) — "Ask to see their assessments" on A2's
 * "Not shared with you" cards. It mirrors the PRISM ask's honest states: no
 * account → nobody to ask; asked; the button (pending while in flight). One
 * ask covers CliftonStrengths and DISC, so both cards share its state.
 */
import { fireEvent, render, screen, within } from "@testing-library/react"
import "@testing-library/jest-dom"

import { BehavioralProfilePanel } from "../BehavioralProfilePanel"
import type { BehavioralProfile, PrismDimension } from "@/types/development"

const prism: PrismDimension[] = [{ id: 1, label: "Innovating", score: 80, quadrant: 1 }]
const recon = { headline: "", throughLine: "", discrepancies: [], confidence: "low" as const }
const clifton = [{ name: "Achiever", rank: 1, domain: "executing" as const }]
const disc = { d: 70, i: 55, s: 40, c: 65, primaryStyle: "D" }

function profile(over: Partial<BehavioralProfile> = {}): BehavioralProfile {
  return {
    prism,
    clifton: null,
    disc: null,
    reconciliation: recon,
    coverage: { prism: true, clifton: true, disc: true },
    ...over,
  } as BehavioralProfile
}

describe("BehavioralProfilePanel — the assessments ask (A3)", () => {
  it("offers the ask on each withheld overlay, and a click asks once", () => {
    const ask = jest.fn()
    render(<BehavioralProfilePanel profile={profile()} memberName="Sam" onRequestAssessments={ask} />)
    const c = within(screen.getByTestId("overlay-not-shared-clifton"))
    const d = within(screen.getByTestId("overlay-not-shared-disc"))
    expect(c.getByRole("button", { name: "Ask to see their assessments" })).toBeEnabled()
    expect(d.getByRole("button", { name: "Ask to see their assessments" })).toBeEnabled()
    fireEvent.click(c.getByRole("button", { name: "Ask to see their assessments" }))
    expect(ask).toHaveBeenCalledTimes(1)
  })

  it("is disabled and says so while the ask is in flight", () => {
    render(
      <BehavioralProfilePanel profile={profile()} memberName="Sam" onRequestAssessments={jest.fn()} assessmentsRequestPending />,
    )
    const c = within(screen.getByTestId("overlay-not-shared-clifton"))
    expect(c.getByRole("button", { name: "Asking…" })).toBeDisabled()
  })

  it("once asked, says so on both cards and offers no second ask", () => {
    render(
      <BehavioralProfilePanel profile={profile()} memberName="Sam" onRequestAssessments={jest.fn()} assessmentsRequestSent />,
    )
    expect(screen.getByTestId("assessments-request-sent-clifton")).toHaveTextContent(
      "Asked. Sam decides, and declining carries no consequence for them.",
    )
    expect(screen.getByTestId("assessments-request-sent-disc")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ask to see their assessments" })).toBeNull()
  })

  it("with no account there is nobody to ask, and no button", () => {
    render(
      <BehavioralProfilePanel profile={profile()} memberName="Sam" noAccount onRequestAssessments={jest.fn()} />,
    )
    expect(screen.getByTestId("assessments-no-account-clifton")).toHaveTextContent(
      "Sam has no InspiresGenius account, so there is nobody to ask.",
    )
    expect(screen.queryByRole("button", { name: "Ask to see their assessments" })).toBeNull()
  })

  it("also on the PRISM-withheld branch, where the overlays render below the PRISM card", () => {
    const ask = jest.fn()
    render(
      <BehavioralProfilePanel
        profile={profile({ prism: [] })}
        notShared
        memberName="Sam"
        onRequestAccess={jest.fn()}
        onRequestAssessments={ask}
      />,
    )
    // The PRISM ask and the assessments ask are separate buttons.
    expect(screen.getByRole("button", { name: "Ask to see this profile" })).toBeInTheDocument()
    fireEvent.click(
      within(screen.getByTestId("overlay-not-shared-disc")).getByRole("button", { name: "Ask to see their assessments" }),
    )
    expect(ask).toHaveBeenCalledTimes(1)
  })

  it("a shared overlay shows its data and no ask", () => {
    render(
      <BehavioralProfilePanel profile={profile({ clifton, disc })} memberName="Sam" onRequestAssessments={jest.fn()} />,
    )
    expect(screen.getByText("Achiever")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ask to see their assessments" })).toBeNull()
  })

  it("a framework not on file keeps today's invite card, with no ask", () => {
    render(
      <BehavioralProfilePanel
        profile={profile({ coverage: { prism: true, clifton: false, disc: false } })}
        memberName="Sam"
        onRequestAssessments={jest.fn()}
      />,
    )
    expect(screen.getByText("CliftonStrengths not on file")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Ask to see their assessments" })).toBeNull()
  })
})
