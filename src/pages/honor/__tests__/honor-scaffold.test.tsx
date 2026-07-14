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

const mockUseHonorAccess = jest.fn()
jest.mock("@/hooks/honor/useHonorAccess", () => ({
  useHonorAccess: () => mockUseHonorAccess(),
  HONOR_VERTICAL: "honor-foundation",
}))

// AppSidebar also reads GRANT + broadcast access — keep them closed/quiet.
jest.mock("@/hooks/grant/useVerticalAccess", () => ({
  useVerticalAccess: () => ({ hasAccess: false, isLoading: false, enabledVerticals: [] }),
}))
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: false } }),
}))

// Keep the singleton axios out of the test (its module runs auth side-effects).
jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn() },
  syncAuthToken: jest.fn(),
}))

import AppSidebar from "@/components/layout/AppSidebar"
import HonorLayout from "../HonorLayout"
import HonorDashboard from "../HonorDashboard"
import HonorCaseload from "../HonorCaseload"

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

describe("Honor Foundation vertical scaffold (Phase 0)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { role: "practitioner", email: "s.carter@honor.org", fullName: "S. Carter" },
      logout: jest.fn(),
    })
  })

  describe("entitlement gates the sidebar section", () => {
    const sidebarProps = {
      role: "practitioner" as const,
      open: true,
      onClose: jest.fn(),
      collapsed: false,
      onToggleCollapse: jest.fn(),
    }

    test("shows the Honor nav section when entitled", () => {
      mockUseHonorAccess.mockReturnValue({
        hasAccess: true,
        isLoading: false,
        enabledVerticals: ["honor-foundation"],
      })
      renderWithProviders(<AppSidebar {...sidebarProps} />)

      expect(screen.getByText("Honor Foundation")).toBeInTheDocument()
      expect(screen.getByText("Coach Workbench")).toBeInTheDocument()
    })

    test("hides the Honor nav section when NOT entitled", () => {
      mockUseHonorAccess.mockReturnValue({
        hasAccess: false,
        isLoading: false,
        enabledVerticals: [],
      })
      renderWithProviders(<AppSidebar {...sidebarProps} />)

      expect(screen.queryByText("Coach Workbench")).not.toBeInTheDocument()
    })
  })

  describe("route entitlement gating + reskin shell", () => {
    function renderHonorRoute() {
      return renderWithProviders(
        <Routes>
          <Route path="/vertical/honor-foundation" element={<HonorLayout />}>
            <Route path="dashboard" element={<HonorDashboard />} />
          </Route>
          <Route path="/home" element={<div data-testid="home-page">Home</div>} />
        </Routes>,
        "/vertical/honor-foundation/dashboard"
      )
    }

    test("redirects an unentitled user away from /vertical/honor-foundation/*", () => {
      mockUseHonorAccess.mockReturnValue({
        hasAccess: false,
        isLoading: false,
        enabledVerticals: [],
      })
      renderHonorRoute()

      expect(screen.getByTestId("home-page")).toBeInTheDocument()
    })

    test("renders the reskinned Honor shell for an entitled user", () => {
      mockUseHonorAccess.mockReturnValue({
        hasAccess: true,
        isLoading: false,
        enabledVerticals: ["honor-foundation"],
      })
      const { container } = renderHonorRoute()

      // THF co-brand wordmark in the shell topbar.
      expect(screen.getByText("The Honor Foundation")).toBeInTheDocument()
      expect(screen.getByText("Inspires Genius")).toBeInTheDocument()
      // The reskin wrapper class scopes the navy/orange tokens.
      expect(container.querySelector(".vertical-honor")).not.toBeNull()
      // Dashboard greeting renders inside the shell.
      expect(screen.getByText(/Hello,/)).toBeInTheDocument()
    })
  })

  describe("caseload renders mock fellows", () => {
    test("lists Honor fellows from the mock fixtures", async () => {
      mockUseHonorAccess.mockReturnValue({
        hasAccess: true,
        isLoading: false,
        enabledVerticals: ["honor-foundation"],
      })
      renderWithProviders(<HonorCaseload />)

      expect(screen.getByRole("heading", { name: "My Members" })).toBeInTheDocument()
      expect(await screen.findByText("Marcus Reyes")).toBeInTheDocument()
      expect(await screen.findByText("Rosa Delgado")).toBeInTheDocument()
    })
  })
})
