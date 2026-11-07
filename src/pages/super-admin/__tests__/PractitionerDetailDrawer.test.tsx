import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PractitionerDetailDrawer } from "../PractitionerDetailDrawer"
import type { RegistryRow } from "@/types/practitioner-registry"

type DetailState = { data?: unknown; isLoading: boolean; error?: unknown }
let state: DetailState
jest.mock("@/hooks/super-admin/usePractitionerDetail", () => ({
  usePractitionerDetail: () => state,
}))

const ROW: RegistryRow = {
  practitionerSub: "p1",
  email: "alice@example.com",
  displayName: "Alice Able",
  siteId: "S1",
  clientId: "C1",
  reference: "R1",
  externalIdent: "E1",
  region: "Europe",
  country: "FR",
  practitionerCode: "ABC-DEF-GHJ",
  active: false,
  deactivatedAt: null,
  createdAt: null,
  updatedAt: null,
}

describe("PractitionerDetailDrawer", () => {
  it("shows the identifiers and a loading line while the counts load", () => {
    state = { isLoading: true }
    render(<PractitionerDetailDrawer row={ROW} onClose={jest.fn()} />)
    expect(screen.getByRole("dialog")).toHaveTextContent("Alice Able")
    expect(screen.getByText("Deactivated")).toBeInTheDocument()
    expect(screen.getByText("S1")).toBeInTheDocument()
    expect(screen.getByText("ABC-DEF-GHJ")).toBeInTheDocument()
    expect(screen.getByText(/Loading counts/)).toBeInTheDocument()
  })

  it("renders a failure instead of showing zero", () => {
    state = { isLoading: false, error: { response: { data: { detail: "practitioner not in registry" } } } }
    render(<PractitionerDetailDrawer row={ROW} onClose={jest.fn()} />)
    expect(screen.getByRole("alert")).toHaveTextContent("practitioner not in registry")
    expect(screen.queryByLabelText("Linked clients count")).not.toBeInTheDocument()
  })

  it("shows both counts, including a real zero", () => {
    state = {
      isLoading: false,
      data: { practitionerSub: "p1", active: false, linkedClients: 0, surveysOnSite30d: 12, surveyWindowDays: 30 },
    }
    render(<PractitionerDetailDrawer row={ROW} onClose={jest.fn()} />)
    expect(screen.getByLabelText("Linked clients count")).toHaveTextContent("0")
    expect(screen.getByLabelText("Surveys on this site count")).toHaveTextContent("12")
    expect(screen.getByText(/Open client invites will appear here/)).toBeInTheDocument()
  })

  it("closing the drawer calls onClose", async () => {
    state = { isLoading: true }
    const onClose = jest.fn()
    const user = userEvent.setup()
    render(<PractitionerDetailDrawer row={ROW} onClose={onClose} />)
    await user.click(screen.getByRole("button", { name: "Close" }))
    expect(onClose).toHaveBeenCalled()
  })
})
