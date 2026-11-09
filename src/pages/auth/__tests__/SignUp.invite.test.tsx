/**
 * @jest-environment jsdom
 *
 * PI-4 S6 — `/signup#invite=<token>`.
 *
 *  • A plain /signup (no fragment) behaves exactly as before: no history
 *    rewrite, no storage write, the same signup() call, the same redirect.
 *  • With the fragment, the token lands in sessionStorage ONLY, the hash is
 *    cleared, and nothing is sent anywhere from this page.
 *  • The capture runs before the signed-in redirect, so a signed-in user who
 *    opens the link keeps the token for the claim.
 */
import { render, screen, fireEvent, act } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import SignUp from "../SignUp"
import { INVITE_STORAGE_KEY } from "@/lib/practitionerInvite"

jest.mock("@/components/auth/AuthLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/components/auth/AuthHeader", () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}))
jest.mock("@/components/auth/AuthFields", () => ({
  EmailField: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input aria-label="email" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
  PasswordField: ({
    id = "password",
    value,
    onChange,
  }: {
    id?: string
    value: string
    onChange: (v: string) => void
  }) => <input aria-label={id} type="password" value={value} onChange={(e) => onChange(e.target.value)} />,
  SocialAuthSection: () => <div />,
}))
jest.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <input type="checkbox" aria-label="terms" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
  ),
}))

const mockSignup = jest.fn()
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ signup: mockSignup, isLoading: false }),
}))
const mockNavigate = jest.fn()
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}))
const mockRedirect = jest.fn()
jest.mock("@/hooks/useAuthRedirectForAuthPages", () => ({
  useAuthRedirectForAuthPages: () => mockRedirect(),
}))
// Nothing on this page may call the engine — the claim runs after sign-in.
const mockAgentPost = jest.fn()
const mockAgentGet = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: { post: (...a: unknown[]) => mockAgentPost(...a), get: (...a: unknown[]) => mockAgentGet(...a) },
}))

const TOKEN = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcde"

function renderSignUp() {
  return render(
    <MemoryRouter>
      <SignUp />
    </MemoryRouter>,
  )
}

async function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("email"), { target: { value: "person@example.com" } })
  fireEvent.change(screen.getByLabelText("password"), { target: { value: "Password123!" } })
  fireEvent.change(screen.getByLabelText("confirm"), { target: { value: "Password123!" } })
  fireEvent.click(screen.getByLabelText("terms"))
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Sign Up" }))
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRedirect.mockReturnValue(null)
  sessionStorage.clear()
  localStorage.clear()
  window.history.replaceState(null, "", "/")
})

describe("SignUp — plain /signup is unchanged", () => {
  it("does not rewrite history or write storage, and signs up exactly as before", async () => {
    window.history.pushState(null, "", "/signup")
    const replaceSpy = jest.spyOn(window.history, "replaceState")
    const setSpy = jest.spyOn(Storage.prototype, "setItem")

    renderSignUp()
    expect(replaceSpy).not.toHaveBeenCalled()
    expect(setSpy).not.toHaveBeenCalled()
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
    expect(window.location.pathname).toBe("/signup")

    await fillAndSubmit()
    expect(mockSignup).toHaveBeenCalledTimes(1)
    expect(mockSignup).toHaveBeenCalledWith("person@example.com", "Password123!", "Password123!")
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockAgentPost).not.toHaveBeenCalled()
    expect(mockAgentGet).not.toHaveBeenCalled()
    expect(sessionStorage.getItem(INVITE_STORAGE_KEY)).toBeNull()

    replaceSpy.mockRestore()
    setSpy.mockRestore()
  })

  it("renders the same form with and without the invite fragment (no banner — PI-3b not built)", () => {
    window.history.pushState(null, "", "/signup")
    const plain = renderSignUp().container.innerHTML
    window.history.pushState(null, "", `/signup#invite=${TOKEN}`)
    const invited = renderSignUp().container.innerHTML
    expect(invited).toBe(plain)
  })

  it("still redirects a signed-in visitor exactly as before", () => {
    mockRedirect.mockReturnValue("/home")
    window.history.pushState(null, "", "/signup")
    renderSignUp()
    expect(mockNavigate).toHaveBeenCalledWith("/home", { replace: true })
  })
})

describe("SignUp — /signup#invite=<token>", () => {
  it("moves the token to sessionStorage, clears the hash, and sends nothing", async () => {
    window.history.pushState(null, "", `/signup#invite=${TOKEN}`)
    renderSignUp()
    expect(sessionStorage.getItem(INVITE_STORAGE_KEY)).toBe(TOKEN)
    expect(window.location.hash).toBe("")
    expect(window.location.href).not.toContain(TOKEN)

    await fillAndSubmit()
    // The token never rides along with sign-up, and the engine is not called.
    expect(mockSignup).toHaveBeenCalledWith("person@example.com", "Password123!", "Password123!")
    expect(JSON.stringify(mockSignup.mock.calls)).not.toContain(TOKEN)
    expect(mockAgentPost).not.toHaveBeenCalled()
    expect(mockAgentGet).not.toHaveBeenCalled()
  })

  it("never puts the token in localStorage", async () => {
    window.history.pushState(null, "", `/signup#invite=${TOKEN}`)
    renderSignUp()
    await fillAndSubmit()
    expect(localStorage.length).toBe(0)
    for (let i = 0; i < localStorage.length; i++) {
      expect(localStorage.getItem(localStorage.key(i) ?? "")).not.toContain(TOKEN)
    }
  })

  it("captures before a signed-in visitor is redirected", () => {
    mockRedirect.mockReturnValue("/home")
    window.history.pushState(null, "", `/signup#invite=${TOKEN}`)
    renderSignUp()
    expect(sessionStorage.getItem(INVITE_STORAGE_KEY)).toBe(TOKEN)
    expect(mockNavigate).toHaveBeenCalledWith("/home", { replace: true })
  })
})
