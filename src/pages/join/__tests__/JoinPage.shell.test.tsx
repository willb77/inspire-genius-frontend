/**
 * @jest-environment jsdom
 *
 * /join sits in the sign-in pages' AuthLayout. These tests prove the shell
 * neither reads auth state nor makes a request nor navigates: a signed-out and
 * a signed-in visitor both stay on /join and see the form.
 */
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import JoinPage from "../JoinPage"
import AuthLayout from "@/components/auth/AuthLayout"
import { AuthContext } from "@/context/auth-context"
import type { AuthContextValue } from "@/types/auth"
import { api } from "@/lib/axios"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/axios", () => {
  const fn = () => jest.fn().mockRejectedValue(new Error("the shared api must not be called from /join"))
  return { __esModule: true, api: { get: fn(), post: fn(), put: fn(), patch: fn(), delete: fn() } }
})

function authValue(signedIn: boolean): AuthContextValue {
  const nope = jest.fn()
  return {
    user: signedIn ? ({ id: "me", email: "member@example.org", role: "user" } as unknown as AuthContextValue["user"]) : null,
    isLoading: false,
    pendingVerification: false,
    pendingRoleSelection: null,
    selectRole: nope,
    hasRole: jest.fn(() => signedIn),
    isAtLeast: jest.fn(() => signedIn),
    login: nope,
    signup: nope,
    verifyOtp: nope,
    resendOtp: nope,
    resetPasswordStart: nope,
    resetPasswordConfirm: nope,
    logout: nope,
    clearAuth: nope,
    setPendingVerification: nope,
    markOnboardingCompleted: nope,
    markFullName: nope,
    completeAuthFromPayload: nope,
  } as AuthContextValue
}

let lastPath = ""
function LocationProbe() {
  lastPath = useLocation().pathname
  return null
}

function renderAt(signedIn: boolean) {
  const value = authValue(signedIn)
  render(
    <AuthContext.Provider value={value}>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/join"]}>
          <LocationProbe />
          <Routes>
            <Route path="/join" element={<JoinPage />} />
            <Route path="*" element={<div>navigated away</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  )
  return value
}

describe.each([
  ["signed out", false],
  ["signed in", true],
])("/join in the platform shell, %s", (_label, signedIn) => {
  it("renders the branded form and stays on /join", async () => {
    const value = renderAt(signedIn)
    expect(await screen.findByRole("form", { name: "Register your interest" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "Register your interest" })).toBeInTheDocument()
    expect(screen.getAllByAltText("Inspire Genius").length).toBeGreaterThan(0)
    expect(screen.queryByText("navigated away")).not.toBeInTheDocument()
    expect(lastPath).toBe("/join")
    // Nothing from auth was invoked, and neither shared client was touched.
    for (const fn of [value.logout, value.clearAuth, value.login, value.completeAuthFromPayload]) {
      expect(fn).not.toHaveBeenCalled()
    }
    for (const m of Object.values(api) as jest.Mock[]) expect(m).not.toHaveBeenCalled()
    for (const m of [agentApi.get, agentApi.post] as jest.Mock[]) expect(m).not.toHaveBeenCalled()
  })
})

describe("AuthLayout contentClassName", () => {
  it("keeps the sign-in width by default", () => {
    render(
      <AuthLayout>
        <p>child</p>
      </AuthLayout>,
    )
    expect(screen.getByText("child").parentElement?.className).toBe("w-full max-w-[360px]")
  })

  it("lets /join widen the content column", () => {
    render(
      <AuthLayout contentClassName="max-w-[560px]">
        <p>child</p>
      </AuthLayout>,
    )
    const cls = screen.getByText("child").parentElement?.className ?? ""
    expect(cls).toContain("max-w-[560px]")
    expect(cls).not.toContain("max-w-[360px]")
  })
})
