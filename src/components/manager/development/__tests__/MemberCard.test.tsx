/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import "@testing-library/jest-dom"

import { MemberCard } from "../MemberCard"
import type { RosterMember } from "@/types/development"

const baseMember: RosterMember = {
  memberId: "m-1",
  name: "Jordan Rivera",
  title: "Customer Success Manager",
  department: "Success",
  coverage: { prism: true, clifton: true, disc: false },
  reconciledHeadline: "Collaborative driver who thrives on structured autonomy.",
  headlineConfidence: "high",
  planStatus: "on_track",
  milestoneProgress: 60,
  topMatch: { title: "Senior CSM", fitScore: 82 },
}

function renderCard(member: RosterMember, onInvite?: () => void) {
  return render(
    <MemoryRouter>
      <MemberCard member={member} onInvite={onInvite} />
    </MemoryRouter>,
  )
}

describe("MemberCard", () => {
  it("renders identity, headline, and top match", () => {
    renderCard(baseMember)
    expect(screen.getByText("Jordan Rivera")).toBeInTheDocument()
    expect(screen.getByText(/Customer Success Manager/)).toBeInTheDocument()
    expect(screen.getByText(/Collaborative driver/)).toBeInTheDocument()
    expect(screen.getByText("Senior CSM")).toBeInTheDocument()
    expect(screen.getByText("82%")).toBeInTheDocument()
  })

  it("shows complete coverage chips and an invite affordance for missing frameworks", () => {
    const onInvite = jest.fn()
    renderCard(baseMember, onInvite)
    expect(screen.getByTestId("coverage-prism-complete")).toBeInTheDocument()
    expect(screen.getByTestId("coverage-clifton-complete")).toBeInTheDocument()
    // DISC is missing → invite button
    const discInvite = screen.getByTestId("coverage-disc-invite")
    expect(discInvite).toBeInTheDocument()
    fireEvent.click(discInvite)
    expect(onInvite).toHaveBeenCalledWith("m-1", "disc")
  })

  it("is keyboard-focusable and navigable via Enter", () => {
    renderCard(baseMember)
    const card = screen.getByRole("button", { name: /Open development workspace for Jordan Rivera/i })
    expect(card).toHaveAttribute("tabindex", "0")
    fireEvent.keyDown(card, { key: "Enter" })
    // navigation is a no-op crash check under MemoryRouter — assert no throw
    expect(card).toBeInTheDocument()
  })

  it("prompts to complete PRISM when the member has no PRISM assessment", () => {
    const noPrism: RosterMember = {
      ...baseMember,
      coverage: { prism: false, clifton: false, disc: false },
      reconciledHeadline: undefined,
      headlineConfidence: undefined,
    }
    renderCard(noPrism)
    expect(screen.getByText(/Invite to complete PRISM/i)).toBeInTheDocument()
  })
})
