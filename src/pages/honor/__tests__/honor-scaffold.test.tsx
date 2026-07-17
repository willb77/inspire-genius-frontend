/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Compass } from "lucide-react"
import type { VerticalKey } from "@/verticals/core"

/* ── Mocks ── */
const mockUseAuth = jest.fn()
jest.mock("@/context/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

// Honor now uses Core's entitlement gate. Mock the leaf useVerticalAccess module
// (which both RequireVertical's relative import and AppSidebar's barrel import
// resolve to) so we control access per vertical. GRANT stays closed.
const mockUseVerticalAccess = jest.fn()
jest.mock("@/verticals/core/useVerticalAccess", () => ({
  useVerticalAccess: (vertical: string) => mockUseVerticalAccess(vertical),
  DEV_ACCESS_KEY: "grant_dev_access",
}))

/** Open the Honor gate (or not); everything else stays closed. */
function setHonorAccess(hasAccess: boolean) {
  mockUseVerticalAccess.mockImplementation((vertical: VerticalKey) =>
    vertical === "honor"
      ? { hasAccess, isLoading: false, enabledVerticals: hasAccess ? ["honor"] : [] }
      : { hasAccess: false, isLoading: false, enabledVerticals: [] }
  )
}

// AppSidebar now surfaces Honor via the registry-driven launcher (not a hardcoded
// section). Mock the launcher hook so the sidebar tests control what it shows.
const mockLauncherSection = jest.fn()
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useVerticalLauncherSection: () => mockLauncherSection(),
}))

const HONOR_LAUNCHER = {
  id: "verticals-launcher",
  label: "Verticals",
  roles: ["practitioner"] as const,
  items: [{ to: "/vertical/honor/dashboard", icon: Compass, label: "Honor Foundation" }],
}

jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: false } }),
}))

// Keep the singleton axios out of the test (its module runs auth side-effects).
jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn() },
  syncAuthToken: jest.fn(),
}))

// Force the fixture layer for the scaffold render tests, independent of the
// live-wiring flags (which point the roster at the live agent-engine endpoint).
jest.mock("@/hooks/honor/mocks", () => ({
  ...jest.requireActual("@/hooks/honor/mocks"),
  USE_HONOR_ROSTER_LIVE: false,
  USE_HONOR_EVAL_LIVE: false,
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

  describe("registry launcher surfaces Honor in the sidebar", () => {
    const sidebarProps = {
      role: "practitioner" as const,
      open: true,
      onClose: jest.fn(),
      collapsed: false,
      onToggleCollapse: jest.fn(),
    }

    test("shows the Honor launcher entry when entitled", () => {
      setHonorAccess(true)
      mockLauncherSection.mockReturnValue(HONOR_LAUNCHER)
      renderWithProviders(<AppSidebar {...sidebarProps} />)

      expect(screen.getByText("Verticals")).toBeInTheDocument()
      expect(screen.getByText("Honor Foundation")).toBeInTheDocument()
    })

    test("hides Honor when not entitled (launcher empty)", () => {
      setHonorAccess(false)
      mockLauncherSection.mockReturnValue(null)
      renderWithProviders(<AppSidebar {...sidebarProps} />)

      expect(screen.queryByText("Honor Foundation")).not.toBeInTheDocument()
    })
  })

  describe("route entitlement gating + reskin shell", () => {
    function renderHonorRoute() {
      return renderWithProviders(
        <Routes>
          <Route path="/vertical/honor" element={<HonorLayout />}>
            <Route path="dashboard" element={<HonorDashboard />} />
          </Route>
          <Route path="/home" element={<div data-testid="home-page">Home</div>} />
        </Routes>,
        "/vertical/honor/dashboard"
      )
    }

    test("redirects an unentitled user away from /vertical/honor/*", () => {
      setHonorAccess(false)
      renderHonorRoute()

      expect(screen.getByTestId("home-page")).toBeInTheDocument()
    })

    test("renders the reskinned Honor shell for an entitled user", () => {
      setHonorAccess(true)
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
      setHonorAccess(true)
      renderWithProviders(<HonorCaseload />)

      expect(screen.getByRole("heading", { name: "My Members" })).toBeInTheDocument()
      expect(await screen.findByText("Marcus Reyes")).toBeInTheDocument()
      expect(await screen.findByText("Rosa Delgado")).toBeInTheDocument()
    })
  })
})
