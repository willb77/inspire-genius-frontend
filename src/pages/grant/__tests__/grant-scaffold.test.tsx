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

const mockUseVerticalAccess = jest.fn()
jest.mock("@/hooks/grant/useVerticalAccess", () => ({
  useVerticalAccess: () => mockUseVerticalAccess(),
}))

// Keep the singleton axios out of the test (its module runs auth side-effects).
jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn() },
  syncAuthToken: jest.fn(),
}))

// Passthrough AppShell so we can assert "inside AppShell" without its heavy deps.
jest.mock("@/layouts/AppShell", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}))

import AppSidebar from "@/components/layout/AppSidebar"
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

  describe("entitlement gates the sidebar section", () => {
    const sidebarProps = {
      role: "user" as const,
      open: true,
      onClose: jest.fn(),
      collapsed: false,
      onToggleCollapse: jest.fn(),
    }

    test("shows the GRANT nav section when entitled", () => {
      mockUseVerticalAccess.mockReturnValue({
        hasAccess: true,
        isLoading: false,
        enabledVerticals: ["grant"],
      })
      renderWithProviders(<AppSidebar {...sidebarProps} />)

      expect(screen.getByText("Financial Aid")).toBeInTheDocument()
      expect(screen.getByText("Aid Dashboard")).toBeInTheDocument()
      expect(screen.getByText("Scholarships")).toBeInTheDocument()
      expect(screen.getByText("My Aid Plan")).toBeInTheDocument()
    })

    test("hides the GRANT nav section when NOT entitled", () => {
      mockUseVerticalAccess.mockReturnValue({
        hasAccess: false,
        isLoading: false,
        enabledVerticals: [],
      })
      renderWithProviders(<AppSidebar {...sidebarProps} />)

      expect(screen.queryByText("Aid Dashboard")).not.toBeInTheDocument()
      expect(screen.queryByText("Financial Aid")).not.toBeInTheDocument()
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

    test("renders the dashboard inside AppShell for an entitled user", () => {
      mockUseVerticalAccess.mockReturnValue({
        hasAccess: true,
        isLoading: false,
        enabledVerticals: ["grant"],
      })
      renderGrantRoute()

      const shell = screen.getByTestId("app-shell")
      expect(shell).toBeInTheDocument()
      const heading = screen.getByRole("heading", { name: "Aid Dashboard" })
      expect(heading).toBeInTheDocument()
      // The dashboard heading must be nested within the AppShell.
      expect(shell).toContainElement(heading)
    })
  })
})
