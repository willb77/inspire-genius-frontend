/**
 * @jest-environment jsdom
 *
 * PI-4 S7 — claim once on the first authenticated load, clear the token on
 * success and on failure, say honestly what happened, and render the existing
 * approval-request step (not an error) while the PRISM gate refuses (D7).
 */
import React, { StrictMode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import PractitionerWelcome, {
  CLAIM_ERROR_MESSAGE,
  NOT_VALID_MESSAGE,
  NO_INVITE_MESSAGE,
  OWN_INVITE_MESSAGE,
  TOO_MANY_MESSAGE,
} from "../PractitionerWelcome"
import { INVITE_STORAGE_KEY } from "@/lib/practitionerInvite"

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="user-layout">{children}</div>,
}))
jest.mock("@/components/prism/PrismRequestApprovalNotice", () => ({
  PrismRequestApprovalNotice: () => <div data-testid="approval-notice">approval request step</div>,
}))
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { token: "t", role: "user", email: "u@example.com", name: "U" } }),
}))
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

const mockClaim = jest.fn()
jest.mock("@/services/practitioner-invites/clientInvites.service", () => ({
  claimClientInvite: (t: string) => mockClaim(t),
}))
let accessValue: { isLoading: boolean; data?: { allowed: boolean } }
jest.mock("@/hooks/prism/usePrismRequestAccess", () => ({
  usePrismRequestAccess: () => accessValue,
}))

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde"

function renderPage(strict = false) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const tree = (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PractitionerWelcome />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}

beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  accessValue = { isLoading: false, data: { allowed: true } }
})

describe("PractitionerWelcome (S7)", () => {
  it("claims exactly once, even under StrictMode, and clears the token on success", async () => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    mockClaim.mockResolvedValue({ outcome: "claimed", practitionerName: "Dr Practitioner" })
    renderPage(true)
    expect(await screen.findByText(/You're now connected to Dr Practitioner\./)).toBeInTheDocument()
    expect(mockClaim).toHaveBeenCalledTimes(1)
    expect(mockClaim).toHaveBeenCalledWith(TOKEN)
    expect(sessionStorage.getItem(INVITE_STORAGE_KEY)).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it("offers the PRISM survey when requests are allowed", async () => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    mockClaim.mockResolvedValue({ outcome: "claimed", practitionerName: "Dr P" })
    renderPage()
    const btn = await screen.findByRole("button", { name: /take your prism survey/i })
    expect(screen.getByText(/Nothing is shared unless you tick that option/)).toBeInTheDocument()
    await userEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith("/prism-assessment")
    expect(screen.queryByTestId("approval-notice")).toBeNull()
  })

  it("renders the existing approval-request step, not an error, while the gate refuses (D7)", async () => {
    accessValue = { isLoading: false, data: { allowed: false } }
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    mockClaim.mockResolvedValue({ outcome: "claimed", practitionerName: "Dr P" })
    renderPage()
    expect(await screen.findByTestId("approval-notice")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /take your prism survey/i })).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("says it is checking access while the access read loads", async () => {
    accessValue = { isLoading: true }
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    mockClaim.mockResolvedValue({ outcome: "claimed", practitionerName: "Dr P" })
    renderPage()
    expect(await screen.findByText(/Checking your PRISM survey access/)).toBeInTheDocument()
  })

  it("shows the neutral message on a 404, clears the token, and does not redirect to /login", async () => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    mockClaim.mockResolvedValue({ outcome: "not_valid" })
    renderPage()
    expect(await screen.findByRole("alert")).toHaveTextContent(NOT_VALID_MESSAGE)
    expect(sessionStorage.getItem(INVITE_STORAGE_KEY)).toBeNull()
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.queryByText(/connected to/)).toBeNull()
  })

  it.each([
    ["too_many", TOO_MANY_MESSAGE],
    ["own_invite", OWN_INVITE_MESSAGE],
    ["error", CLAIM_ERROR_MESSAGE],
  ])("renders %s honestly and clears the token", async (outcome, message) => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    mockClaim.mockResolvedValue({ outcome })
    renderPage()
    expect(await screen.findByRole("alert")).toHaveTextContent(message)
    expect(sessionStorage.getItem(INVITE_STORAGE_KEY)).toBeNull()
  })

  it("offers the way home after a failure", async () => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    mockClaim.mockResolvedValue({ outcome: "not_valid" })
    renderPage()
    await screen.findByRole("alert")
    await userEvent.click(screen.getByRole("button", { name: /go to your home page/i }))
    expect(mockNavigate).toHaveBeenCalledWith("/home")
    expect(mockNavigate).not.toHaveBeenCalledWith(expect.stringContaining("/login"))
  })

  it("does not claim when no token is waiting, and says so", async () => {
    renderPage()
    expect(screen.getByText(NO_INVITE_MESSAGE)).toBeInTheDocument()
    await waitFor(() => expect(mockClaim).not.toHaveBeenCalled())
  })
})
