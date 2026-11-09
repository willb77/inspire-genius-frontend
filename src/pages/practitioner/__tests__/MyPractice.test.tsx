import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import MyPractice, {
  DARK_MESSAGE,
  DEACTIVATED_BANNER,
  INVITES_OFF_TITLE,
  LOAD_ERROR,
  NOT_REGISTERED_BANNER,
} from "../MyPractice"
import type { MyPracticeRegistration, MyPracticeState } from "@/types/practitioner-practice"

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))

const toastSuccess = jest.fn()
const toastError = jest.fn()
jest.mock("sonner", () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}))

const copy = jest.fn()
jest.mock("@/lib/copyText", () => ({ copyText: (t: string) => copy(t) }))

let invitesValue: { data?: { state: "live" | "off" } }
jest.mock("@/hooks/practitioner/useClientInvites", () => ({
  useClientInvites: () => invitesValue,
}))
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

let hookValue: { data?: MyPracticeState; isLoading: boolean; error: unknown }
jest.mock("@/hooks/practitioner/useMyPracticeRegistration", () => ({
  useMyPracticeRegistration: () => hookValue,
}))

const REG: MyPracticeRegistration = {
  practitionerCode: "ABC-DEF-GHJ",
  siteId: "SITE-1",
  clientId: "CLIENT-1",
  reference: "REF-1",
  active: true,
  deactivatedAt: null,
}

function registered(overrides: Partial<MyPracticeRegistration> = {}): MyPracticeState {
  return { state: "registered", registration: { ...REG, ...overrides } }
}

beforeEach(() => {
  copy.mockReset()
  toastSuccess.mockReset()
  toastError.mockReset()
  hookValue = { data: registered(), isLoading: false, error: null }
  invitesValue = { data: { state: "off" } }
  mockNavigate.mockReset()
})

describe("MyPractice (S3)", () => {
  it("shows the code and the read-only PRISM ids, with no banner, for an active row", () => {
    render(<MyPractice />, { wrapper: MemoryRouter })
    expect(screen.getByRole("heading", { name: "My PRISM practice" })).toBeInTheDocument()
    expect(screen.getByTestId("practice-code")).toHaveTextContent("ABC-DEF-GHJ")
    expect(screen.getByText("SITE-1")).toBeInTheDocument()
    expect(screen.getByText("CLIENT-1")).toBeInTheDocument()
    expect(screen.getByText("REF-1")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).toBeNull()
    // Read-only: no inputs to edit the ids.
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("copies the code and confirms only when the copy succeeded", async () => {
    copy.mockResolvedValue(true)
    render(<MyPractice />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole("button", { name: /copy code/i }))
    expect(copy).toHaveBeenCalledWith("ABC-DEF-GHJ")
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Code copied"))
    expect(toastError).not.toHaveBeenCalled()
  })

  it("says so when the copy fails", async () => {
    copy.mockResolvedValue(false)
    render(<MyPractice />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole("button", { name: /copy code/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("copies a ready-made message that contains the code", async () => {
    copy.mockResolvedValue(true)
    render(<MyPractice />, { wrapper: MemoryRouter })
    await userEvent.click(screen.getByRole("button", { name: /copy a message/i }))
    expect(copy.mock.calls[0][0]).toContain("ABC-DEF-GHJ")
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Message copied"))
  })

  it("banners a deactivated row but still shows its details", () => {
    hookValue = { data: registered({ active: false, deactivatedAt: "2026-11-01T00:00:00Z" }), isLoading: false, error: null }
    render(<MyPractice />, { wrapper: MemoryRouter })
    expect(screen.getByRole("alert")).toHaveTextContent(DEACTIVATED_BANNER)
    expect(screen.getByText("SITE-1")).toBeInTheDocument()
  })

  it("banners a missing row and shows no code", () => {
    hookValue = { data: { state: "missing" }, isLoading: false, error: null }
    render(<MyPractice />, { wrapper: MemoryRouter })
    expect(screen.getByRole("alert")).toHaveTextContent(NOT_REGISTERED_BANNER)
    expect(screen.queryByTestId("practice-code")).toBeNull()
  })

  it("says the programme is off when dark", () => {
    hookValue = { data: { state: "dark" }, isLoading: false, error: null }
    render(<MyPractice />, { wrapper: MemoryRouter })
    expect(screen.getByRole("alert")).toHaveTextContent(DARK_MESSAGE)
  })

  it("reports a load failure instead of a false 'not registered'", () => {
    hookValue = { data: undefined, isLoading: false, error: new Error("503") }
    render(<MyPractice />, { wrapper: MemoryRouter })
    expect(screen.getByRole("alert")).toHaveTextContent(LOAD_ERROR)
    expect(screen.queryByText(NOT_REGISTERED_BANNER)).toBeNull()
  })

  it("shows a loading state", () => {
    hookValue = { data: undefined, isLoading: true, error: null }
    render(<MyPractice />, { wrapper: MemoryRouter })
    expect(screen.getByRole("status")).toHaveTextContent(/loading/i)
  })

  it("handles a row with no code issued", () => {
    hookValue = { data: registered({ practitionerCode: null }), isLoading: false, error: null }
    render(<MyPractice />, { wrapper: MemoryRouter })
    expect(screen.getByText(/no code has been issued/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /copy code/i })).toBeNull()
  })

  it("keeps Invite a client disabled, and says why, while invite links are off", () => {
    render(<MyPractice />, { wrapper: MemoryRouter })
    const btn = screen.getByRole("button", { name: /invite a client/i })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute("title", INVITES_OFF_TITLE)
  })

  it("enables Invite a client when invite links apply, and opens the Clients page", async () => {
    invitesValue = { data: { state: "live" } }
    render(<MyPractice />, { wrapper: MemoryRouter })
    const btn = screen.getByRole("button", { name: /invite a client/i })
    expect(btn).toBeEnabled()
    await userEvent.click(btn)
    expect(mockNavigate).toHaveBeenCalledWith("/practitioner/clients")
  })
})
