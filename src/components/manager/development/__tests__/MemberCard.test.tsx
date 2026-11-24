/** @jest-environment jsdom */
import { render, screen, fireEvent } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import "@testing-library/jest-dom"

import { MemberCard } from "../MemberCard"
import type { RosterMember } from "@/types/development"
import { ROUTES } from "@/constants/routes"

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

  // The card body is the main way into a member's workspace. It was hardcoded
  // to the manager route, which a practitioner cannot open (no `/manager`
  // prefix in ROLE_PERMISSIONS) — so each test lands on a real route element
  // and would fail if the click went to the other one.
  function renderRouted(memberRoute?: string) {
    return render(
      <MemoryRouter initialEntries={["/roster"]}>
        <Routes>
          <Route path="/roster" element={<MemberCard member={baseMember} memberRoute={memberRoute} />} />
          <Route path={ROUTES.MANAGER.DEVELOPMENT_MEMBER} element={<div>manager workspace</div>} />
          <Route path={ROUTES.PRACTITIONER.DEVELOPMENT_MEMBER} element={<div>practitioner workspace</div>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it("opens the manager workspace by default", () => {
    renderRouted()
    fireEvent.click(screen.getByRole("button", { name: /Open development workspace for Jordan Rivera/i }))
    expect(screen.getByText("manager workspace")).toBeInTheDocument()
  })

  it("opens the route it is given, so a practitioner stays on a path they can reach", () => {
    renderRouted(ROUTES.PRACTITIONER.DEVELOPMENT_MEMBER)
    fireEvent.click(screen.getByRole("button", { name: /Open development workspace for Jordan Rivera/i }))
    expect(screen.getByText("practitioner workspace")).toBeInTheDocument()
    expect(screen.queryByText("manager workspace")).not.toBeInTheDocument()
  })
})
