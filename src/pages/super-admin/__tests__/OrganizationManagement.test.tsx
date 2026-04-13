import { render, screen } from "@testing-library/react"
import SuperAdminOrganizations from "../OrganizationManagement"
import React from "react"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
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

jest.mock("@/components/shared/ActionMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="action-menu" />,
}))

jest.mock("@/components/shared/forms/ConfirmActionModal", () => ({
  __esModule: true,
  default: () => <div data-testid="confirm-modal" />,
}))

jest.mock("@/components/super-admin/organization/AddOrganizations", () => ({
  __esModule: true,
  default: () => <div data-testid="add-organization" />,
}))

jest.mock("@/components/super-admin/ManagementHeader", () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => (
    <div data-testid="management-header">{title}</div>
  ),
}))

const mockUseOrganizationManagement = jest.fn()
jest.mock("@/hooks/super-admin/organization-management/useOrganizationManagement", () => ({
  useOrganizationManagement: () => mockUseOrganizationManagement(),
  useDeactivateOrganization: () => ({ mutate: jest.fn(), isPending: false }),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

describe("SuperAdminOrganizations", () => {
  beforeEach(() => {
    mockUseOrganizationManagement.mockReturnValue({
      data: {
        data: {
          organizations: [
            { id: "1", name: "Acme Corp", type: "corporate", status: true, admin_is_active: true },
          ],
          total: 1,
        },
      },
      isLoading: false,
      refetch: jest.fn(),
    })
  })

  it("renders the management header", () => {
    render(<SuperAdminOrganizations />)
    expect(screen.getByText("Organization Management")).toBeInTheDocument()
  })

  it("renders data table with organizations", () => {
    render(<SuperAdminOrganizations />)
    expect(screen.getByTestId("data-table")).toBeInTheDocument()
  })

  it("shows loading message when loading", () => {
    mockUseOrganizationManagement.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    })
    render(<SuperAdminOrganizations />)
    expect(screen.getByText("Loading organizations...")).toBeInTheDocument()
  })

  it("shows empty state when no organizations", () => {
    mockUseOrganizationManagement.mockReturnValue({
      data: { data: { organizations: [], total: 0 } },
      isLoading: false,
      refetch: jest.fn(),
    })
    render(<SuperAdminOrganizations />)
    expect(screen.getByText("No organizations found")).toBeInTheDocument()
  })

  it("wraps content in SuperAdminLayout", () => {
    render(<SuperAdminOrganizations />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
  })
})
