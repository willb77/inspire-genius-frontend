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

// Mock the hook module, not the `@/verticals/core` barrel — GrantLayout pulls
// VerticalShell from the barrel too, and a barrel mock would blank it out.
const mockUseVerticalAccess = jest.fn()
jest.mock("@/verticals/core/useVerticalAccess", () => ({
  useVerticalAccess: () => mockUseVerticalAccess(),
}))

// Keep the singleton axios out of the test (its module runs auth side-effects).
jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn() },
  syncAuthToken: jest.fn(),
}))

// Render the dashboard against the fixture layer, independent of the production
// USE_GRANT_MOCKS flag (now false for the dev go-live).
jest.mock("@/hooks/grant/mocks", () => ({
  ...jest.requireActual("@/hooks/grant/mocks"),
  USE_GRANT_MOCKS: true,
}))

// Passthrough the shared SidebarScaffold (VerticalShell's chrome as of Phase 6.4,
// which replaced the legacy AppShell). It renders the routed children plus the
// section labels + item labels it receives, so we can assert both "inside the
// scaffold" and that GRANT keeps its Financial Aid sub-nav.
jest.mock("@/hooks/audit/usePageViewAudit", () => ({ usePageViewAudit: jest.fn() }))
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: ({
    children,
    navSections,
  }: {
    children: React.ReactNode
    navSections?: Array<{ label: string; items: Array<{ label: string }> }>
  }) => (
    <div data-testid="sidebar-scaffold">
      <nav>
        {(navSections ?? []).flatMap((s) => s.items).map((it) => (
          <span key={it.label}>{it.label}</span>
        ))}
      </nav>
      {children}
    </div>
  ),
}))

import GrantLayout from "../GrantLayout"
import GrantDashboardPage from "../GrantDashboardPage"

function renderWithProviders(ui: React.ReactNode, initialPath = "/") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe("GRANT vertical scaffold (UI-0)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { role: "user", email: "a@b.com", fullName: "Test User" },
      logout: jest.fn(),
    })
  })

  describe("route entitlement gating", () => {
    function renderGrantRoute() {
      return renderWithProviders(
        <Routes>
          <Route path="/vertical/grant" element={<GrantLayout />}>
            <Route path="dashboard" element={<GrantDashboardPage />} />
          </Route>
          <Route path="/home" element={<div data-testid="home-page">Home</div>} />
        </Routes>,
        "/vertical/grant/dashboard"
      )
    }

    test("redirects an unentitled user away from /vertical/grant/*", () => {
      mockUseVerticalAccess.mockReturnValue({
        hasAccess: false,
        isLoading: false,
        enabledVerticals: [],
      })
      renderGrantRoute()

      expect(screen.getByTestId("home-page")).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "Aid Dashboard" })).not.toBeInTheDocument()
    })

    test("renders the dashboard inside the shared scaffold for an entitled user", () => {
      mockUseVerticalAccess.mockReturnValue({
        hasAccess: true,
        isLoading: false,
        enabledVerticals: ["grant"],
      })
      renderGrantRoute()

      const shell = screen.getByTestId("sidebar-scaffold")
      expect(shell).toBeInTheDocument()
      const heading = screen.getByRole("heading", { name: "Aid Dashboard" })
      expect(heading).toBeInTheDocument()
      // The dashboard heading must be nested within the shared scaffold.
      expect(shell).toContainElement(heading)
    })

    test("GRANT keeps its Financial Aid sub-nav in the scaffold", () => {
      mockUseVerticalAccess.mockReturnValue({
        hasAccess: true,
        isLoading: false,
        enabledVerticals: ["grant"],
      })
      renderGrantRoute()

      // The scaffold receives the GRANT section's page items (nav-rendered above).
      const nav = screen.getByTestId("sidebar-scaffold").querySelector("nav")
      expect(nav?.textContent).toContain("Aid Dashboard")
      expect(nav?.textContent).toContain("Scholarships")
      expect(nav?.textContent).toContain("My Aid Plan")
    })
  })
})
