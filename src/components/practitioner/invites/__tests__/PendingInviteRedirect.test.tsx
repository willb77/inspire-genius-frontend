/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { PendingInviteRedirect } from "../PendingInviteRedirect"
import { INVITE_STORAGE_KEY } from "@/lib/practitionerInvite"

let authValue: { user: { token?: string } | null; pendingRoleSelection: unknown }
jest.mock("@/context/useAuth", () => ({ useAuth: () => authValue }))
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde"

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PendingInviteRedirect />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  authValue = { user: { token: "t" }, pendingRoleSelection: null }
})

describe("PendingInviteRedirect", () => {
  it("sends a signed-in user with a waiting invite to S7", () => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    renderAt("/home")
    expect(mockNavigate).toHaveBeenCalledWith("/welcome/practitioner", { replace: true })
  })
  it("does nothing without a waiting invite (everyone else)", () => {
    renderAt("/home")
    expect(mockNavigate).not.toHaveBeenCalled()
  })
  it("does nothing before sign-in", () => {
    authValue = { user: null, pendingRoleSelection: null }
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    renderAt("/signup")
    expect(mockNavigate).not.toHaveBeenCalled()
  })
  it("waits while a role is being chosen", () => {
    authValue = { user: { token: "t" }, pendingRoleSelection: { roles: ["a", "b"] } }
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    renderAt("/home")
    expect(mockNavigate).not.toHaveBeenCalled()
  })
  it("does not loop on S7 itself", () => {
    sessionStorage.setItem(INVITE_STORAGE_KEY, TOKEN)
    renderAt("/welcome/practitioner")
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
