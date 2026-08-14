/**
 * @jest-environment jsdom
 *
 * Who sees what on /surveys:
 *   author     = every role EXCEPT plain `user` → Build + Results
 *   respondent = every role                     → Take
 * So `user` sees Take only; every other role sees all three tabs.
 *
 * These assert the RENDERED surface only. The authoritative check lives in
 * survey-service `app/authz.py`; hiding a tab is presentation, not security.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import SurveysPage from "@/pages/user/SurveysPage"

jest.mock("@/layouts/UnifiedLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}))

const mockUseAuth = jest.fn()
jest.mock("@/context/useAuth", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}))

// Record which scopes actually get queried — a role with no access must not
// fire a request that can only come back 403.
const listSpy = jest.fn()
jest.mock("@/hooks/survey/useSurveys", () => ({
  __esModule: true,
  useSurveys: (scope: string, enabled = true) => {
    listSpy(scope, enabled)
    return { data: [], isLoading: false, isError: false }
  },
  useCreateSurvey: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateSurvey: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteSurvey: () => ({ mutate: jest.fn(), isPending: false }),
  useSubmitResponse: () => ({ mutate: jest.fn(), isPending: false }),
  useSurveyResponses: () => ({ data: [], isLoading: false }),
  useSurveySummary: () => ({ data: null, isLoading: false }),
  useParseSurvey: () => ({ mutate: jest.fn(), isPending: false }),
}))

function renderAs(role: string) {
  mockUseAuth.mockReturnValue({
    user: { role },
    // Deliberately generous: if the page still consulted isAtLeast, every role
    // would pass and these tests would not catch the regression.
    isAtLeast: () => true,
  })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SurveysPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("SurveysPage role gating", () => {
  it("super-admin gets Take, Build and Results", () => {
    renderAs("super-admin")
    expect(screen.getByRole("tab", { name: /take a survey/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /build surveys/i })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: /results/i })).toBeInTheDocument()
  })

  it("user gets Take only — never Build or Results", () => {
    renderAs("user")
    expect(screen.getByRole("tab", { name: /take a survey/i })).toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: /build surveys/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("tab", { name: /results/i })).not.toBeInTheDocument()
  })

  it.each(["manager", "company-admin", "practitioner", "distributor"])(
    "%s gets all three tabs — authors can answer their own survey",
    (role) => {
      renderAs(role)
      expect(screen.getByRole("tab", { name: /take a survey/i })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: /build surveys/i })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: /results/i })).toBeInTheDocument()
    },
  )

  it("an unrecognised role still falls back to NO access, not full access", () => {
    renderAs("some-future-role")
    expect(screen.getByText(/not recognised/i)).toBeInTheDocument()
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
  })

  it("does not query a scope the role cannot use", () => {
    renderAs("user")
    expect(listSpy).toHaveBeenCalledWith("take", true)
    expect(listSpy).toHaveBeenCalledWith("manage", false)
  })

  it("queries both scopes for an author", () => {
    renderAs("manager")
    expect(listSpy).toHaveBeenCalledWith("manage", true)
    expect(listSpy).toHaveBeenCalledWith("take", true)
  })

  it("queries nothing at all for an unrecognised role", () => {
    renderAs("some-future-role")
    for (const call of listSpy.mock.calls) {
      expect(call[1]).toBe(false)
    }
  })
})
