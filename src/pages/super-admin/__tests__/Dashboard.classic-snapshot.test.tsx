import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import SuperAdminDashboard from "../Dashboard"

/**
 * Pins the classic (house OFF) dashboard's rendered markup, tab by tab. The
 * snapshot was taken BEFORE the agents table and cost formatting were shared
 * with the house admin home, so a diff here means the classic page changed.
 */

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
jest.mock("@/components/super-admin/dashboard/UsedCoachesChart", () => ({
  __esModule: true,
  default: () => <div>chart</div>,
}))
jest.mock("@/components/super-admin/CostBoard", () => ({ __esModule: true, default: () => <div>costboard</div> }))

jest.mock("@/hooks/super-admin/dashboard/useDashboardSystem", () => ({
  useDashboardSystem: () => ({
    data: {
      data: {
        organization_statistics: { total: 48, active: 42, inactive: 6 },
        business_statistics: { total: 120, active: 100, inactive: 20, by_type: { corporate: 80, education: 40 } },
      },
    },
    isLoading: false,
  }),
}))
jest.mock("@/hooks/super-admin/user-management/useUserManagement", () => ({
  useUserManagement: () => ({
    data: {
      data: {
        users: [{ user_id: "1", full_name: "Test User", email: "person@example.org", role: "user", is_active: true, created_at: "2026-04-08T12:00:00Z" }],
        pagination: { total: 100 },
      },
    },
    isLoading: false,
  }),
}))
jest.mock("@/hooks/super-admin/coach-management/useCoaches", () => ({
  useCoachesList: () => ({
    data: { data: { agents: [{ id: "meridian-001", name: "Meridian", status: "active" }, { id: "aura-001", name: "Aura", status: "deactivated" }] } },
    isLoading: false,
  }),
}))
jest.mock("@/hooks/audit/useAudit", () => ({ useAuditStats: () => ({ data: { data: { logs_today: 12 } } }) }))
jest.mock("@/hooks/feedback/useFeedback", () => ({
  useFeedbackStats: () => ({ data: { data: { total_count: 200, avg_rating: 4.3 } }, isLoading: false }),
}))
jest.mock("@/hooks/trainer/useTrainer", () => ({
  useCostDashboard: () => ({
    data: { data: { total_cost: 45678, cost_per_user: 3.55, total_sessions: 84320 } },
    isLoading: false,
  }),
}))

describe("classic super-admin dashboard markup (house OFF)", () => {
  beforeEach(() => localStorage.clear())

  it("is unchanged on every tab", async () => {
    const { container } = render(
      <MemoryRouter>
        <SuperAdminDashboard />
      </MemoryRouter>,
    )
    expect(container.innerHTML).toMatchSnapshot("agents tab")
    await userEvent.click(screen.getByRole("tab", { name: "Organizations" }))
    expect(container.innerHTML).toMatchSnapshot("organizations tab")
    await userEvent.click(screen.getByRole("tab", { name: "Cost Analysis" }))
    expect(container.innerHTML).toMatchSnapshot("cost tab")
  })
})
