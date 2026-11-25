/** @jest-environment jsdom */
/**
 * TDS-U11b — a practitioner's client with no account yet is shown as such:
 * "Not connected yet", no development page, and the two places that are real
 * (the client record, and My Clients where the invite is sent).
 */
import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import "@testing-library/jest-dom"

import type { UnconnectedClient } from "@/lib/practitionerRoster"

let clients: UnconnectedClient[] | undefined = []
jest.mock("@/hooks/manager/development/useTeamDevelopmentRoster", () => ({
  useUnconnectedClients: () => ({ data: clients }),
}))

import { UnconnectedClientsSection } from "../UnconnectedClientsSection"

function renderSection(search?: string) {
  return render(
    <MemoryRouter>
      <UnconnectedClientsSection search={search} />
    </MemoryRouter>,
  )
}

it("renders nothing when there are no unconnected clients (every roster today)", () => {
  clients = []
  const { container } = renderSection()
  expect(container).toBeEmptyDOMElement()
  clients = undefined
  const again = renderSection()
  expect(again.container).toBeEmptyDOMElement()
})

it("shows each client as not connected, with links to the client record and My Clients only", () => {
  clients = [
    { clientId: "cl-1", name: "Ada Client" },
    { clientId: "cl 2/x", name: "Bo Client" },
  ]
  renderSection()
  expect(screen.getByRole("heading", { name: /have not connected an account \(2\)/ })).toBeInTheDocument()
  const cards = screen.getAllByTestId("unconnected-client-card")
  expect(cards).toHaveLength(2)

  const first = within(cards[0])
  expect(first.getByText("Ada Client")).toBeInTheDocument()
  expect(first.getByText("Not connected yet")).toBeInTheDocument()
  expect(first.getByText(/InspiresGenius account/)).toBeInTheDocument()
  expect(first.getByRole("link", { name: "Open client record" })).toHaveAttribute("href", "/practitioner/clients/cl-1")
  expect(first.getByRole("link", { name: "Invite from My Clients" })).toHaveAttribute("href", "/practitioner/clients")

  // The id is encoded into the path, never spliced in raw.
  expect(within(cards[1]).getByRole("link", { name: "Open client record" })).toHaveAttribute(
    "href",
    "/practitioner/clients/cl%202%2Fx",
  )

  // No card opens a development page, and the card itself is not a button.
  for (const link of screen.getAllByRole("link")) {
    expect(link.getAttribute("href")).not.toMatch(/development/)
  }
  expect(screen.queryByRole("button")).toBeNull()
})

it("follows the Studio's search box by name", () => {
  clients = [
    { clientId: "cl-1", name: "Ada Client" },
    { clientId: "cl-2", name: "Bo Client" },
  ]
  renderSection("bo")
  expect(screen.getAllByTestId("unconnected-client-card")).toHaveLength(1)
  expect(screen.getByText("Bo Client")).toBeInTheDocument()
})

it("renders nothing when the search hides every client", () => {
  clients = [{ clientId: "cl-1", name: "Ada Client" }]
  const { container } = renderSection("zzz")
  expect(container).toBeEmptyDOMElement()
  fireEvent.click(document.body)
})
