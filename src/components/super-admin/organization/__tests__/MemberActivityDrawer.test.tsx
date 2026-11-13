import { render, screen } from "@testing-library/react"

import { MemberActivityDrawer } from "../MemberActivityDrawer"

const mockActivity = jest.fn()
jest.mock("@/hooks/audit/useUserActivity", () => ({
  useUserActivity: (...a: unknown[]) => mockActivity(...a),
}))
const mockUsage = jest.fn()
jest.mock("@/hooks/super-admin/useOrgUsage", () => ({
  useMemberUsage: (...a: unknown[]) => mockUsage(...a),
}))

const member = { userId: "u1", name: "Ann Lee", email: "ann@example.com", role: "user", isActive: true }

const usageData = {
  org_id: "o1", user_id: "u1", is_active: true, window_days: 30, since: "",
  cost_basis: "Estimated AI-model cost per response.",
  totals: { sessions: 2, responses: 7, total_tokens: 700, estimated_cost_usd: 0.31, last_active_at: "2026-11-02T10:00:00" },
  daily: [],
  by_agent: [{ agent_name: "Alex", responses: 7, estimated_cost_usd: 0.31 }],
  by_model_tier: [],
  recent_sessions: [{ session_id: "s1", started_at: "2026-11-02T09:00:00", last_at: "2026-11-02T10:00:00", responses: 7, estimated_cost_usd: 0.31 }],
}

function renderDrawer() {
  return render(<MemberActivityDrawer orgId="o1" days={30} member={member} onClose={() => {}} />)
}

describe("MemberActivityDrawer", () => {
  beforeEach(() => {
    mockActivity.mockReturnValue({
      isLoading: false, isError: false,
      data: { userId: "u1", lastLogin: { at: "2026-11-02T08:00:00Z", action: "auth.user.login" }, loginCount: 4, locationRecorded: false, activity: [{ id: "e1", at: "2026-11-02T08:00:00Z", action: "auth.user.login", description: "Signed in" }] },
    })
    mockUsage.mockReturnValue({ isLoading: false, isError: false, data: usageData })
  })

  it("shows status, sign-in, usage, cost and activity for the member", () => {
    renderDrawer()
    expect(screen.getByText("Ann Lee")).toBeInTheDocument()
    expect(screen.getByText("Active account")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("7", { selector: "dd" })).toBeInTheDocument()
    expect(screen.getAllByText("$0.31").length).toBeGreaterThan(0)
    expect(screen.getByText("Alex")).toBeInTheDocument()
    expect(screen.getByText("Signed in")).toBeInTheDocument()
    expect(mockUsage).toHaveBeenCalledWith("o1", "u1", 30)
  })

  it("says never signed in only on a real answer", () => {
    mockActivity.mockReturnValue({ isLoading: false, isError: false, data: { userId: "u1", lastLogin: null, loginCount: 0, locationRecorded: false, activity: [] } })
    renderDrawer()
    expect(screen.getByText("Never signed in")).toBeInTheDocument()
    expect(screen.getByText("No recorded activity.")).toBeInTheDocument()
  })

  it("renders failed reads as failures, not as no activity or $0.00", () => {
    mockActivity.mockReturnValue({ isLoading: false, isError: true })
    mockUsage.mockReturnValue({ isLoading: false, isError: true })
    renderDrawer()
    const alerts = screen.getAllByRole("alert")
    expect(alerts).toHaveLength(3)
    expect(screen.queryByText("Never signed in")).not.toBeInTheDocument()
    expect(screen.queryByText("No recorded activity.")).not.toBeInTheDocument()
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument()
  })
})
