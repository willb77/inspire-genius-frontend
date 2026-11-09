/**
 * @jest-environment jsdom
 */
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import PractitionerClients from "../Clients"

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="practitioner-layout">{children}</div>
  ),
}))
const mockToastError = jest.fn()
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: (m: string) => mockToastError(m) } }))

// PI-4. Default: the invite routes do not apply (the server's plain 404), so
// the page must be exactly the roster it was.
const mockUseClientInvites = jest.fn()
const mockCreateInvite = jest.fn()
jest.mock("@/hooks/practitioner/useClientInvites", () => ({
  useClientInvites: () => mockUseClientInvites(),
  useCreateClientInvite: () => ({ mutate: mockCreateInvite, isPending: false }),
  useRevokeClientInvite: () => ({ mutate: jest.fn(), isPending: false }),
  useRotateClientInvite: () => ({ mutate: jest.fn(), isPending: false }),
}))

const mockUseCoachClients = jest.fn()
jest.mock("@/hooks/practitioner/useCoachClient", () => ({
  useCoachClients: () => mockUseCoachClients(),
  useAddCoachClient: () => ({ mutate: jest.fn(), isPending: false }),
  useBulkImportCoachClients: () => ({ mutate: jest.fn(), isPending: false }),
}))

const ROSTER = [
  { id: "cl-1", name: "Marcus Chen", email: "marcus@techcorp.com", org: "TechCorp Inc", sessions: 12, prismScore: 82, prismStatus: "ready", topGoals: ["Delegation"], resourcesPresent: 7, status: "active" },
  { id: "cl-2", name: "Sophie Laurent", email: "sophie@ce.com", org: "CreativeEdge", sessions: 20, prismScore: 91, prismStatus: "ready", topGoals: ["Exec"], resourcesPresent: 10, status: "active" },
]

const q = (data: unknown, over: Record<string, unknown> = {}) => ({
  data,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  ...over,
})

function renderPage(path = "/practitioner/clients") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PractitionerClients />
    </MemoryRouter>,
  )
}

describe("PractitionerClients", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCoachClients.mockReturnValue(q(ROSTER))
    mockUseClientInvites.mockReturnValue({ data: { state: "off" }, isError: false, refetch: jest.fn() })
  })

  it("renders inside the layout with the My Clients title", () => {
    renderPage()
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
    expect(screen.getByText("My Clients")).toBeInTheDocument()
  })

  it("renders the Add Client and Bulk Import actions", () => {
    renderPage()
    expect(screen.getAllByText("Add Client").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Bulk Import").length).toBeGreaterThan(0)
  })

  it("lists clients from the coachClient hook", () => {
    renderPage()
    expect(screen.getByText("Marcus Chen")).toBeInTheDocument()
    expect(screen.getByText("Sophie Laurent")).toBeInTheDocument()
  })

  it("renders a loading state without crashing", () => {
    mockUseCoachClients.mockReturnValue(q(undefined, { isLoading: true }))
    renderPage()
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
  })

  it("does not list clients on error", () => {
    mockUseCoachClients.mockReturnValue(q(undefined, { error: new Error("fail") }))
    renderPage()
    expect(screen.queryByText("Marcus Chen")).not.toBeInTheDocument()
  })

  it("with invites off, shows no tabs and no Invite action (unchanged page)", () => {
    renderPage()
    expect(screen.queryByRole("tab")).toBeNull()
    expect(screen.queryByRole("button", { name: /^invite /i })).toBeNull()
    expect(screen.queryByText("Invite")).toBeNull()
  })
})

describe("PractitionerClients — invites live (S4/S5)", () => {
  const INVITES = [
    {
      id: "i-1",
      clientId: "cl-1",
      email: "invitee@example.com",
      status: "pending",
      createdAt: null,
      expiresAt: null,
      claimedAt: null,
      claimedEmail: null,
      revokedAt: null,
      rotatedFrom: null,
    },
  ]
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCoachClients.mockReturnValue(q(ROSTER))
    mockUseClientInvites.mockReturnValue({
      data: { state: "live", invites: INVITES },
      isError: false,
      refetch: jest.fn(),
    })
  })

  it("adds the Clients / Invitations tabs and an Invite action per client", () => {
    renderPage()
    expect(screen.getByRole("tab", { name: "Clients" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Invitations" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Invite Marcus Chen" })).toBeInTheDocument()
  })

  it("creates an invite for a client and shows the link once", async () => {
    mockCreateInvite.mockImplementation((_id, opts) => {
      opts.onSuccess({ invite: INVITES[0], invitePath: "/signup#invite=ONCE" })
      opts.onSettled()
    })
    renderPage()
    await userEvent.click(screen.getByRole("button", { name: "Invite Marcus Chen" }))
    expect(mockCreateInvite).toHaveBeenCalledWith("cl-1", expect.any(Object))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByText(/shown once/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText("Invite link")).toHaveValue(`${window.location.origin}/signup#invite=ONCE`)
  })

  it("reports a refused create with the server's words", async () => {
    const { AxiosError, AxiosHeaders } = jest.requireActual("axios")
    const err = new AxiosError("x", "ERR", undefined, undefined, {
      status: 409,
      statusText: "",
      data: { detail: "This client is already connected to an account." },
      headers: {},
      config: { headers: new AxiosHeaders() },
    })
    mockCreateInvite.mockImplementation((_id, opts) => {
      opts.onError(err)
      opts.onSettled()
    })
    renderPage()
    await userEvent.click(screen.getByRole("button", { name: "Invite Sophie Laurent" }))
    expect(mockToastError).toHaveBeenCalledWith("This client is already connected to an account.")
  })

  it("locks every Invite button while one create is in flight", async () => {
    mockCreateInvite.mockImplementation(() => undefined) // never settles
    renderPage()
    await userEvent.click(screen.getByRole("button", { name: "Invite Marcus Chen" }))
    expect(screen.getByRole("button", { name: "Invite Sophie Laurent" })).toBeDisabled()
  })

  it("opens the Invitations tab from ?tab=invites", () => {
    renderPage("/practitioner/clients?tab=invites")
    expect(screen.getByRole("tab", { name: "Invitations" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByTestId("invite-row-i-1")).toBeInTheDocument()
  })

  it("switches tabs", async () => {
    renderPage()
    await userEvent.click(screen.getByRole("tab", { name: "Invitations" }))
    expect(screen.getByRole("tab", { name: "Invitations" })).toHaveAttribute("aria-selected", "true")
    await userEvent.click(screen.getByRole("tab", { name: "Clients" }))
    expect(screen.getByRole("tab", { name: "Clients" })).toHaveAttribute("aria-selected", "true")
  })

  it("shows an honest load error on the Invitations tab", () => {
    mockUseClientInvites.mockReturnValue({ data: undefined, isError: true, refetch: jest.fn() })
    renderPage("/practitioner/clients?tab=invites")
    expect(screen.getByRole("alert")).toHaveTextContent(/could not be loaded/)
    // The per-client Invite action needs the live list.
    expect(screen.queryByRole("button", { name: /^invite /i })).toBeNull()
  })
})
