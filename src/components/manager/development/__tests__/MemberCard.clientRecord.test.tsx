/** @jest-environment jsdom */
/**
 * TDS-U11b — a linked client's card on the practitioner Studio links to the
 * client record (sessions, documents, follow-ups, PRISM import), keyed on the
 * client id. Any other card, and every card on the manager mount, is unchanged.
 */
import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import "@testing-library/jest-dom"

import { MemberCard } from "../MemberCard"
import type { RosterMember } from "@/types/development"
import { ROUTES } from "@/constants/routes"

const base: RosterMember = {
  memberId: "acct-1",
  name: "Lee Client",
  coverage: { prism: false, clifton: false, disc: false },
  planStatus: null,
}
const linked = { ...base, clientId: "cl-1", connected: true } as RosterMember

function renderAt(member: RosterMember, clientRoute?: string) {
  return render(
    <MemoryRouter initialEntries={["/practitioner/development"]}>
      <Routes>
        <Route
          path="/practitioner/development"
          element={
            <MemberCard
              member={member}
              memberRoute={ROUTES.PRACTITIONER.DEVELOPMENT_MEMBER}
              clientRoute={clientRoute}
            />
          }
        />
        <Route path={ROUTES.PRACTITIONER.DEVELOPMENT_MEMBER} element={<div>person page</div>} />
        <Route path={ROUTES.PRACTITIONER.CLIENT_DETAIL} element={<div>client record page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

it("a linked client's card links to its client record", () => {
  renderAt(linked, ROUTES.PRACTITIONER.CLIENT_DETAIL)
  const link = screen.getByTestId("member-card-client-record")
  expect(link).toHaveAttribute("href", "/practitioner/clients/cl-1")
  expect(link).toHaveTextContent("Client record")
})

it("following the link opens the client record, not the person page under it", () => {
  renderAt(linked, ROUTES.PRACTITIONER.CLIENT_DETAIL)
  fireEvent.click(screen.getByTestId("member-card-client-record"))
  expect(screen.getByText("client record page")).toBeInTheDocument()
  expect(screen.queryByText("person page")).toBeNull()
})

it("Enter on the link does not also fire the card's own Enter", () => {
  renderAt(linked, ROUTES.PRACTITIONER.CLIENT_DETAIL)
  fireEvent.keyDown(screen.getByTestId("member-card-client-record"), { key: "Enter" })
  expect(screen.queryByText("person page")).toBeNull()
})

it("the card body still opens the person page", () => {
  renderAt(linked, ROUTES.PRACTITIONER.CLIENT_DETAIL)
  fireEvent.click(screen.getByRole("button", { name: /Lee Client/ }))
  expect(screen.getByText("person page")).toBeInTheDocument()
})

it("no link on a card without a client id (every card today)", () => {
  renderAt(base, ROUTES.PRACTITIONER.CLIENT_DETAIL)
  expect(screen.queryByTestId("member-card-client-record")).toBeNull()
})

it("no link when the mount passes no client route (the manager Studio)", () => {
  renderAt(linked)
  expect(screen.queryByTestId("member-card-client-record")).toBeNull()
})
