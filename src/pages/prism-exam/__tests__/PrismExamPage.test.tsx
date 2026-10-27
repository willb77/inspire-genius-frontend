import React from "react"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import PrismExamPage from "../PrismExamPage"

jest.mock("@/layouts/UnifiedLayout", () => ({
  __esModule: true,
  default: ({ role, children }: { role: string; children: React.ReactNode }) => (
    <div data-testid="unified-layout" data-role={role}>
      {children}
    </div>
  ),
}))
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: { role: "manager" } }) }))

let access: { data?: unknown; isLoading?: boolean; isError?: boolean; error?: unknown } = {}
jest.mock("@/hooks/super-admin/usePrismExam", () => ({ useExamAccess: () => access }))
const content = jest.fn()
jest.mock("@/pages/super-admin/PrismExam", () => ({
  PrismExamContent: (props: { superAdmin: boolean; access: unknown }) => {
    content(props)
    return <div>exam content</div>
  },
}))

function renderAt() {
  return render(
    <MemoryRouter initialEntries={["/prism-exam"]}>
      <Routes>
        <Route path="/prism-exam" element={<PrismExamPage />} />
        <Route path="/super-admin/prism-exam" element={<div>super-admin page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe("PrismExamPage (granted users)", () => {
  beforeEach(() => jest.clearAllMocks())

  it("shows the exam to a granted account, in its own role's layout", () => {
    const data = { allowed: true, super_admin: false, daily_cap: 5, runs_last_24h: 0 }
    access = { data }
    renderAt()
    expect(screen.getByTestId("unified-layout")).toHaveAttribute("data-role", "manager")
    expect(screen.getByText("exam content")).toBeInTheDocument()
    expect(content).toHaveBeenCalledWith({ superAdmin: false, access: data })
  })

  it("says so, and shows nothing of the exam, without a grant", () => {
    access = { data: { allowed: false, super_admin: false, daily_cap: null, runs_last_24h: 0 } }
    renderAt()
    expect(screen.getByText(/has not been given access to the PRISM exam/)).toBeInTheDocument()
    expect(content).not.toHaveBeenCalled()
  })

  it("reports a failed access check rather than an empty page", () => {
    access = { isError: true, error: { response: { data: { detail: "boom" } } } }
    renderAt()
    expect(screen.getByText(/Could not check access: boom/)).toBeInTheDocument()
    expect(content).not.toHaveBeenCalled()
  })

  it("waits for the check", () => {
    access = { isLoading: true }
    renderAt()
    expect(screen.getByText("Checking access…")).toBeInTheDocument()
  })

  it("sends a super-admin to their own page", () => {
    access = { data: { allowed: true, super_admin: true, daily_cap: null, runs_last_24h: 0 } }
    renderAt()
    expect(screen.getByText("super-admin page")).toBeInTheDocument()
  })
})
