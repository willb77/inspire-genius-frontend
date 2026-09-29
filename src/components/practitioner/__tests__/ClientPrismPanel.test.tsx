/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { ClientPrismPanel } from "../ClientPrismPanel"
import type { ClientPrism } from "@/types/practitioner/coachClient"

const none = (state: ClientPrism["state"]): ClientPrism => ({ state, colours: null, assessedAt: null })

describe("ClientPrismPanel", () => {
  it("renders the four canon colours, rounded, when shared", () => {
    render(
      <ClientPrismPanel
        clientName="Casey"
        prism={{ state: "shared", colours: { Gold: 61.4, Green: 72.5, Blue: 40, Red: null }, assessedAt: null }}
      />,
    )
    expect(screen.getByTestId("client-prism-shared")).toBeInTheDocument()
    for (const name of ["Gold", "Green", "Blue", "Red"]) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(screen.queryByText("Orange")).not.toBeInTheDocument()
    expect(screen.getByText("61")).toBeInTheDocument()
    expect(screen.getByText("73")).toBeInTheDocument()
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("says the client has not shared — not that there is no PRISM", () => {
    render(<ClientPrismPanel clientName="Casey" prism={none("not_shared")} />)
    expect(screen.getByText(/hasn.t shared their PRISM with you/i)).toBeInTheDocument()
    expect(screen.queryByText(/no report is on file/i)).not.toBeInTheDocument()
  })

  it("says there is no linked account", () => {
    render(<ClientPrismPanel clientName="Casey" prism={none("not_linked")} />)
    expect(screen.getByText(/no.*platform account linked|doesn.t have a platform account/i)).toBeInTheDocument()
  })

  it("says shared-but-nothing-on-file", () => {
    render(<ClientPrismPanel clientName="Casey" prism={none("no_prism")} />)
    expect(screen.getByText(/shared their PRISM with you, but no report is on file/i)).toBeInTheDocument()
  })

  it("renders a failure as an alert", () => {
    render(<ClientPrismPanel clientName="Casey" prism={none("unavailable")} />)
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn.t be loaded/i)
  })
})
