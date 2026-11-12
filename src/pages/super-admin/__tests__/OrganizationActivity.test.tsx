import React from "react"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import OrganizationActivity from "../OrganizationActivity"
import type { OrgUsage } from "@/types/super-admin/orgUsage"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockDrawer = jest.fn()
jest.mock("@/components/super-admin/organization/MemberActivityDrawer", () => ({
  MemberActivityDrawer: (props: unknown) => {
    mockDrawer(props)
    return <div data-testid="member-drawer" />
  },
}))

jest.mock("@/hooks/super-admin/organization-management/useOrganizationManagement", () => ({
  useOrg: () => ({ data: { id: "org-1", name: "Example College" } }),
}))

const mockUseOrgUsage = jest.fn()
jest.mock("@/hooks/super-admin/useOrgUsage", () => ({
  useOrgUsage: (...a: unknown[]) => mockUseOrgUsage(...a),
}))

const mockUseUserManagement = jest.fn()
jest.mock("@/hooks/super-admin/user-management/useUserManagement", () => ({
  useUserManagement: (...a: unknown[]) => mockUseUserManagement(...a),
}))

const USAGE: OrgUsage = {
  org_id: "org-1",
  window_days: 30,
  since: "2026-10-13T00:00:00",
  cost_basis: "Estimated AI-model cost per response. Voice, hosting and PRISM credits are not recorded per person and are not included.",
  totals: { members: 2, active_members: 1, sessions: 3, responses: 12, total_tokens: 900, estimated_cost_usd: 0.42 },
  members: [
    { user_id: "u-ann", is_active: true, sessions: 3, responses: 12, total_tokens: 900, estimated_cost_usd: 0.42, last_active_at: "2026-11-01T09:00:00" },
    { user_id: "u-bob-0000", is_active: false, sessions: 0, responses: 0, total_tokens: 0, estimated_cost_usd: 0, last_active_at: null },
  ],
  daily: [],
  by_agent: [{ agent_name: "Aura", responses: 12, estimated_cost_usd: 0.42 }],
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/super-admin/organizations/org-1/activity"]}>
      <Routes>
        <Route path="/super-admin/organizations/:id/activity" element={<OrganizationActivity />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockDrawer.mockClear()
  mockUseOrgUsage.mockReturnValue({ data: USAGE, isLoading: false, isError: false })
  mockUseUserManagement.mockReturnValue({
    data: { data: { users: [{ user_id: "u-ann", full_name: "Ann Lee", email: "ann@example.com", role: "user" }], pagination: { total: 2 } } },
    isError: false,
  })
})

describe("OrganizationActivity", () => {
  it("shows the org totals, the cost basis and cost by coach", () => {
    renderPage()
    expect(screen.getByRole("heading", { name: "Example College: Activity" })).toBeInTheDocument()
    expect(screen.getAllByText("Members")).toHaveLength(2) // stat card + table card
    expect(screen.getAllByText("$0.42").length).toBeGreaterThan(0)
    expect(screen.getByText(/Voice, hosting and PRISM credits/)).toBeInTheDocument()
    expect(screen.getByText("Cost by coach")).toBeInTheDocument()
    expect(mockUseOrgUsage).toHaveBeenLastCalledWith("org-1", 30)
  })

  it("lists every member, idle ones included, joined to their names", () => {
    renderPage()
    const rows = within(screen.getAllByRole("table")[1]).getAllByRole("row")
    expect(within(rows[1]).getByRole("button", { name: "Ann Lee" })).toBeInTheDocument()
    // a member with no name on file is shown by id, never dropped
    expect(within(rows[2]).getByRole("button", { name: "Member u-bob-00" })).toBeInTheDocument()
    expect(within(rows[2]).getByText("No AI use")).toBeInTheDocument()
    expect(within(rows[2]).getByText("Inactive")).toBeInTheDocument()
  })

  it("opens the member drawer with that person and the current window", () => {
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "Ann Lee" }))
    expect(screen.getByTestId("member-drawer")).toBeInTheDocument()
    expect(mockDrawer).toHaveBeenLastCalledWith(expect.objectContaining({
      orgId: "org-1",
      days: 30,
      member: { userId: "u-ann", name: "Ann Lee", email: "ann@example.com", role: "user", isActive: true },
    }))
  })

  it("changes the window", () => {
    renderPage()
    fireEvent.click(screen.getByRole("button", { name: "7 days" }))
    expect(mockUseOrgUsage).toHaveBeenLastCalledWith("org-1", 7)
  })

  it("renders a failed read as a failure, never as zero usage", () => {
    mockUseOrgUsage.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { response: { status: 403 } } })
    renderPage()
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("Could not load this organization's usage (HTTP 403)")
    expect(alert).toHaveTextContent("not zero usage")
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument()
  })

  it("says when names could not be loaded instead of hiding members", () => {
    mockUseUserManagement.mockReturnValue({ data: undefined, isError: true })
    renderPage()
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load member names")
    expect(screen.getByRole("button", { name: "Member u-ann" })).toBeInTheDocument()
  })
})
