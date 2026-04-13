import { render, screen } from "@testing-library/react"
import AuditLog from "../AuditLog"
import React from "react"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

jest.mock("@/components/super-admin/organization/DataTable", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table">rows: {data.length}</div>
  ),
}))

jest.mock("@/components/shared/Pagination", () => ({
  __esModule: true,
  default: () => <div data-testid="pagination" />,
}))

jest.mock("@/components/shared/LoadingSkeleton", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-skeleton" />,
}))

const mockUseAuditLogs = jest.fn()
const mockUseAuditStats = jest.fn()
jest.mock("@/hooks/audit/useAudit", () => ({
  useAuditLogs: (...args: unknown[]) => mockUseAuditLogs(...args),
  useAuditStats: (...args: unknown[]) => mockUseAuditStats(...args),
}))

describe("AuditLog", () => {
  beforeEach(() => {
    mockUseAuditLogs.mockReturnValue({
      data: {
        data: {
          logs: [
            { id: "1", timestamp: "2026-03-01T00:00:00Z", action: "login", actor_email: "a@b.com", target_type: "user", description: "Logged in" },
          ],
          total: 1,
          limit: 15,
        },
      },
      isLoading: false,
    })
    mockUseAuditStats.mockReturnValue({
      data: {
        data: {
          total_logs: 500,
          logs_today: 42,
          top_actors: [{ actor_id: "1" }, { actor_id: "2" }],
        },
      },
      isLoading: false,
    })
  })

  it("renders the page title", () => {
    render(<AuditLog />)
    expect(screen.getByText("Audit Log")).toBeInTheDocument()
  })

  it("renders metric cards with data", () => {
    render(<AuditLog />)
    expect(screen.getByText("Total Events")).toBeInTheDocument()
    expect(screen.getByText("500")).toBeInTheDocument()
    expect(screen.getByText("Events Today")).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("Unique Actors")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("renders loading skeleton when loading", () => {
    mockUseAuditLogs.mockReturnValue({ data: undefined, isLoading: true })
    render(<AuditLog />)
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument()
  })

  it("renders data table when loaded", () => {
    render(<AuditLog />)
    expect(screen.getByTestId("data-table")).toBeInTheDocument()
  })

  it("renders search input", () => {
    render(<AuditLog />)
    expect(screen.getByPlaceholderText("Search actor...")).toBeInTheDocument()
  })

  it("wraps content in SuperAdminLayout", () => {
    render(<AuditLog />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
  })
})
