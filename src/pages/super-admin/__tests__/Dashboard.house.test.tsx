import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import SuperAdminDashboard from "../Dashboard"
import { tileState } from "../house/dashboardTiles"

// Reserved example domain (RFC 2606), built at runtime.
const mockMail = (user: string) => `${user}@example.org`

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/components/super-admin/dashboard/UsedCoachesChart", () => ({ __esModule: true, default: () => null }))
jest.mock("@/components/super-admin/CostBoard", () => ({ __esModule: true, default: () => null }))

type Q = { data?: unknown; isLoading: boolean; isError: boolean; refetch: jest.Mock }
const ok = (data: unknown): Q => ({ data, isLoading: false, isError: false, refetch: jest.fn() })
const failed = (): Q => ({ data: undefined, isLoading: false, isError: true, refetch: jest.fn() })
const loading = (): Q => ({ data: undefined, isLoading: true, isError: false, refetch: jest.fn() })

const USERS = ok({
  data: {
    users: [
      { user_id: "1", full_name: "Test Person", email: mockMail("person"), role: "user", is_active: true, created_at: "2026-04-08T12:00:00Z" },
    ],
    pagination: { total: 1206 },
  },
})
let mockUsers: Q = USERS
let mockCoaches: Q = ok({ data: { agents: [{ id: "a", status: "active" }, { id: "b", status: "deactivated" }] } })
let mockFeedback: Q = ok({ data: { total_count: 200, avg_rating: 4.3 } })
let mockCost: Q = ok({ data: { total_cost: 412 } })

jest.mock("@/hooks/super-admin/dashboard/useDashboardSystem", () => ({
  useDashboardSystem: () => ({ data: undefined, isLoading: false }),
}))
jest.mock("@/hooks/super-admin/user-management/useUserManagement", () => ({
  useUserManagement: () => mockUsers,
}))
jest.mock("@/hooks/super-admin/coach-management/useCoaches", () => ({
  useCoachesList: () => mockCoaches,
}))
jest.mock("@/hooks/audit/useAudit", () => ({ useAuditStats: () => ({ data: undefined }) }))
jest.mock("@/hooks/feedback/useFeedback", () => ({ useFeedbackStats: () => mockFeedback }))
jest.mock("@/hooks/trainer/useTrainer", () => ({ useCostDashboard: () => mockCost }))

function renderPage() {
  return render(
    <MemoryRouter>
      <SuperAdminDashboard />
    </MemoryRouter>,
  )
}

describe("Super-admin dashboard — house style switch", () => {
  beforeEach(() => {
    localStorage.clear()
    mockUsers = USERS
    mockCoaches = ok({ data: { agents: [{ id: "a", status: "active" }, { id: "b", status: "deactivated" }] } })
    mockFeedback = ok({ data: { total_count: 200, avg_rating: 4.3 } })
    mockCost = ok({ data: { total_cost: 412 } })
  })

  it("switch OFF (default): the classic dashboard, unchanged", () => {
    renderPage()
    expect(screen.getByText("Platform Dashboard")).toBeInTheDocument()
    expect(screen.getByText("Platform Health")).toBeInTheDocument()
    expect(screen.getByText("Healthy")).toBeInTheDocument()
    expect(screen.queryByText("Admin home")).not.toBeInTheDocument()
    expect(screen.queryByText("View as…")).not.toBeInTheDocument()
  })

  describe("switch ON", () => {
    beforeEach(() => localStorage.setItem("house_style_admin", "true"))

    it("shows the admin home header with the View as… switcher", () => {
      renderPage()
      expect(screen.getByRole("heading", { level: 1, name: "Admin home" })).toBeInTheDocument()
      expect(screen.getByText("What needs your attention across the platform today.")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /View as…/ })).toBeInTheDocument()
      expect(screen.queryByText("Platform Dashboard")).not.toBeInTheDocument()
    })

    it("never shows made-up health figures — says monitoring is not connected", () => {
      renderPage()
      const health = screen.getByTestId("tile-Platform health")
      expect(within(health).getByText("—")).toBeInTheDocument()
      expect(within(health).getByText("Health monitoring isn't set up yet.")).toBeInTheDocument()
      for (const fake of ["Healthy", "~120ms", "0.12%", "99.97%"]) {
        expect(screen.queryByText(fake)).not.toBeInTheDocument()
      }
    })

    it("shows real figures from the existing data", () => {
      renderPage()
      expect(within(screen.getByTestId("tile-People")).getByText("1,206")).toBeInTheDocument()
      expect(within(screen.getByTestId("tile-Active coaches")).getByText("1")).toBeInTheDocument()
      expect(within(screen.getByTestId("tile-Active coaches")).getByText("2 in total")).toBeInTheDocument()
      expect(within(screen.getByTestId("tile-Coach feedback")).getByText("Average rating 4.3")).toBeInTheDocument()
      expect(within(screen.getByTestId("tile-AI cost this month")).getByText("$412")).toBeInTheDocument()
      expect(screen.getByText("Test Person")).toBeInTheDocument()
      expect(screen.getByText("Apr 8, 2026")).toBeInTheDocument()
    })

    it("a failed source reads as an error with a dash, never as zero", () => {
      mockCost = failed()
      mockFeedback = ok({ data: {} })
      renderPage()
      const cost = screen.getByTestId("tile-AI cost this month")
      expect(within(cost).getByText("—")).toBeInTheDocument()
      expect(within(cost).getByText("We couldn't load this.")).toBeInTheDocument()
      const fb = screen.getByTestId("tile-Coach feedback")
      expect(within(fb).getByText("—")).toBeInTheDocument()
      expect(within(fb).getByText("Not available yet.")).toBeInTheDocument()
    })

    it("a failed people list shows the error state with Try again, not 'No people yet'", async () => {
      mockUsers = failed()
      renderPage()
      expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load new people.")
      expect(screen.queryByText("No people yet")).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: "Try again" }))
      expect(mockUsers.refetch).toHaveBeenCalled()
    })

    it("an empty people list says so", () => {
      mockUsers = ok({ data: { users: [], pagination: { total: 0 } } })
      renderPage()
      expect(screen.getByText("No people yet")).toBeInTheDocument()
      expect(within(screen.getByTestId("tile-People")).getByText("0")).toBeInTheDocument()
    })

    it("loading shows outlines, not numbers", () => {
      mockUsers = loading()
      renderPage()
      expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument()
      expect(within(screen.getByTestId("tile-People")).queryByText("—")).not.toBeInTheDocument()
    })

    it("View as… lists the five role home pages as plain links", async () => {
      renderPage()
      await userEvent.click(screen.getByRole("button", { name: /View as…/ }))
      const expected: Record<string, string> = {
        User: "/home",
        Manager: "/manager/dashboard",
        "Company admin": "/company-admin/dashboard",
        Practitioner: "/practitioner/home",
        Distributor: "/distributor/dashboard",
      }
      for (const [label, href] of Object.entries(expected)) {
        expect(await screen.findByRole("menuitem", { name: label })).toHaveAttribute("href", href)
      }
      expect(screen.getByText("Opens that role's home page. Your own access doesn't change.")).toBeInTheDocument()
    })
  })
})

describe("tileState", () => {
  it("maps loading, error, missing and present figures", () => {
    expect(tileState({ isLoading: true, isError: false }, "1")).toEqual({ kind: "loading" })
    expect(tileState({ isLoading: false, isError: true }, "1")).toEqual({ kind: "error" })
    expect(tileState({ isLoading: false, isError: false }, null)).toEqual({ kind: "unavailable", note: "Not available yet." })
    expect(tileState({ isLoading: false, isError: false }, "5", "n")).toEqual({ kind: "value", value: "5", note: "n" })
  })
})
