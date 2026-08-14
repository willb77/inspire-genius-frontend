/**
 * @jest-environment jsdom
 *
 * Who sees what on /surveys. The rule is two role SETS, not a rank:
 *   author     = manager, company-admin, practitioner, super-admin → Build + Results
 *   respondent = user, super-admin                                 → Take
 * Only `distributor` has neither, and gets a no-access card.
 *
 * The interesting case is the ASYMMETRY: a non-super-admin author sees Build
 * and Results but no Take — it may build a survey it cannot answer.
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

  it.each(["manager", "company-admin", "practitioner"])(
    "%s authors — Build and Results, but NOT Take",
    (role) => {
      renderAs(role)
      expect(screen.getByRole("tab", { name: /build surveys/i })).toBeInTheDocument()
      expect(screen.getByRole("tab", { name: /results/i })).toBeInTheDocument()
      expect(screen.queryByRole("tab", { name: /take a survey/i })).not.toBeInTheDocument()
    },
  )

  it.each(["manager", "company-admin", "practitioner"])(
    "%s opens on Build, not on a Take panel it has no tab for",
    (role) => {
      renderAs(role)
      expect(screen.getByRole("tab", { name: /build surveys/i })).toHaveAttribute(
        "aria-selected",
        "true",
      )
    },
  )

  it("distributor is the only role with no access at all", () => {
    renderAs("distributor")
    expect(screen.getByText(/aren't available for your role/i)).toBeInTheDocument()
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
  })

  it("does not query a scope the role cannot use", () => {
    renderAs("user")
    expect(listSpy).toHaveBeenCalledWith("take", true)
    expect(listSpy).toHaveBeenCalledWith("manage", false)
  })

  it("queries manage but not take for a non-taking author", () => {
    renderAs("manager")
    expect(listSpy).toHaveBeenCalledWith("manage", true)
    expect(listSpy).toHaveBeenCalledWith("take", false)
  })

  it("queries nothing at all for distributor", () => {
    renderAs("distributor")
    for (const call of listSpy.mock.calls) {
      expect(call[1]).toBe(false)
    }
  })
})
