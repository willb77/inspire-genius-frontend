/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/* ── Mocks ── */
const mockUseAuth = jest.fn()
jest.mock("@/context/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock the hook module, not the `@/verticals/core` barrel — the layout pulls
// VerticalShell from the barrel too, and a barrel mock would blank it out.
const mockUseVerticalAccess = jest.fn()
jest.mock("@/verticals/core/useVerticalAccess", () => ({
  useVerticalAccess: () => mockUseVerticalAccess(),
  DEV_ACCESS_KEY: "job-blueprint_dev_access",
}))

// Keep the singleton axios out of the test; the dashboard's hooks read it.
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn().mockResolvedValue({ data: { data: [] } }),
    post: jest.fn().mockResolvedValue({ data: { data: {} } }),
    put: jest.fn().mockResolvedValue({ data: { data: {} } }),
  },
  syncAuthToken: jest.fn(),
}))

// Passthrough AppShell so we can assert "inside AppShell" without its heavy deps.
jest.mock("@/layouts/AppShell", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-shell">{children}</div>
  ),
}))

import { JOB_BLUEPRINT } from "@/verticals/job-blueprint/manifest"
import { getVertical, listVerticals } from "@/verticals/core"
import JobBlueprintLayout from "../JobBlueprintLayout"
import JobBlueprintDashboardPage from "../JobBlueprintDashboardPage"

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

describe("Job DNA vertical scaffold", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: { role: "manager", email: "a@b.com", fullName: "Test User" },
      logout: jest.fn(),
    })
  })

  describe("manifest registration", () => {
    test("registers with the expected shape", () => {
      expect(JOB_BLUEPRINT.key).toBe("job-blueprint")
      expect(JOB_BLUEPRINT.routePrefix).toBe("/vertical/job-blueprint")
      expect(JOB_BLUEPRINT.homePath).toBe("/vertical/job-blueprint/dashboard")
      // Accent must be distinct from GRANT's blue.
      expect(JOB_BLUEPRINT.accent).not.toBe("#3B5BFF")
    })

    test("is discoverable through the Core registry", () => {
      expect(getVertical("job-blueprint")).toEqual(JOB_BLUEPRINT)
      expect(listVerticals().some((v) => v.key === "job-blueprint")).toBe(true)
    })
  })

  describe("route entitlement gating", () => {
    function renderRoute() {
      return renderWithProviders(
        <Routes>
          <Route path="/vertical/job-blueprint" element={<JobBlueprintLayout />}>
            <Route path="dashboard" element={<JobBlueprintDashboardPage />} />
          </Route>
          <Route path="/home" element={<div data-testid="home-page">Home</div>} />
        </Routes>,
        "/vertical/job-blueprint/dashboard"
      )
    }

    test("redirects an unentitled user away from /vertical/job-blueprint/*", () => {
      mockUseVerticalAccess.mockReturnValue({
        hasAccess: false,
        isLoading: false,
        enabledVerticals: [],
      })
      renderRoute()
      expect(screen.getByTestId("home-page")).toBeInTheDocument()
    })

    test("renders the dashboard inside AppShell for an entitled user", async () => {
      mockUseVerticalAccess.mockReturnValue({
        hasAccess: true,
        isLoading: false,
        enabledVerticals: ["job-blueprint"],
      })
      renderRoute()

      const shell = screen.getByTestId("app-shell")
      expect(shell).toBeInTheDocument()
      const heading = await screen.findByRole("heading", { name: "Job DNA" })
      expect(shell).toContainElement(heading)
      // Empty backend → the empty-state CTA is offered.
      await waitFor(() =>
        expect(screen.getByText(/Create your first Job DNA/i)).toBeInTheDocument()
      )
    })
  })
})
