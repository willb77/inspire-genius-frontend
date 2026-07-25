/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/* ── Mocks ── */
const mockUseAuth = jest.fn()
jest.mock("@/context/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock the hook module, not the `@/verticals/core` barrel — JobFitLayout pulls
// VerticalShell from the barrel too, and a barrel mock would blank it out.
const mockUseVerticalAccess = jest.fn()
jest.mock("@/verticals/core/useVerticalAccess", () => ({
  useVerticalAccess: () => mockUseVerticalAccess(),
}))

// Keep the singleton axios out of the test.
jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn() },
  syncAuthToken: jest.fn(),
}))

// Mock the matches hook so the child page renders deterministically.
const mockUseFitMatches = jest.fn()
jest.mock("@/hooks/job-fit/useFitMatches", () => ({
  useFitMatches: () => mockUseFitMatches(),
}))

// Passthrough the shared SidebarScaffold (VerticalShell's chrome as of Phase
// 6.4, which replaced the legacy AppShell) so we can assert "inside the scaffold"
// without its heavy deps.
jest.mock("@/hooks/audit/usePageViewAudit", () => ({ usePageViewAudit: jest.fn() }))
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sidebar-scaffold">{children}</div>
  ),
}))

import JobFitLayout from "../JobFitLayout"
import MatchesPage from "../MatchesPage"

function renderWithProviders(ui: React.ReactNode, initialPath = "/") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

function renderJobFitRoute() {
  return renderWithProviders(
    <Routes>
      <Route path="/vertical/job-fit" element={<JobFitLayout />}>
        <Route path="matches" element={<MatchesPage />} />
      </Route>
      <Route path="/home" element={<div data-testid="home-page">Home</div>} />
    </Routes>,
    "/vertical/job-fit/matches"
  )
}

describe("Job-Fit vertical scaffold", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { role: "user", email: "a@b.com", fullName: "Test User" },
      logout: jest.fn(),
    })
    mockUseFitMatches.mockReturnValue({ data: [], isLoading: false, isError: false })
  })

  test("redirects an unentitled user away from /vertical/job-fit/*", () => {
    mockUseVerticalAccess.mockReturnValue({
      hasAccess: false,
      isLoading: false,
      enabledVerticals: [],
    })
    renderJobFitRoute()

    expect(screen.getByTestId("home-page")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Your Role Matches" })).not.toBeInTheDocument()
  })

  test("renders matches inside AppShell for an entitled user", () => {
    mockUseVerticalAccess.mockReturnValue({
      hasAccess: true,
      isLoading: false,
      enabledVerticals: ["job-fit"],
    })
    renderJobFitRoute()

    const shell = screen.getByTestId("sidebar-scaffold")
    expect(shell).toBeInTheDocument()
    const heading = screen.getByRole("heading", { name: "Your Role Matches" })
    expect(heading).toBeInTheDocument()
    expect(shell).toContainElement(heading)
  })
})
