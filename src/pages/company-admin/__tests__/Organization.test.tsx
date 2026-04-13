/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import CompanyAdminOrganization from "../Organization";

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="company-admin-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: any) => (
    <div data-testid={`data-card-${title}`}>{children}</div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockRefetch = jest.fn();

jest.mock("@/hooks/company-admin/useCompanyAdmin", () => ({
  useCompanyDepartments: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("CompanyAdminOrganization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within CompanyAdminLayout", () => {
    render(<CompanyAdminOrganization />);
    expect(screen.getByTestId("company-admin-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<CompanyAdminOrganization />);
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Organization structure, departments, and team hierarchy."
      )
    ).toBeInTheDocument();
  });

  it("renders summary stat cards", () => {
    render(<CompanyAdminOrganization />);
    expect(screen.getByText("Departments")).toBeInTheDocument();
    expect(screen.getByText("Total Headcount")).toBeInTheDocument();
    // "Teams" appears in stat card and table header
    expect(screen.getAllByText("Teams").length).toBeGreaterThan(0);
    expect(screen.getByText("Avg Dept Size")).toBeInTheDocument();
  });

  it("renders org chart with CEO", () => {
    render(<CompanyAdminOrganization />);
    expect(screen.getByText("CEO")).toBeInTheDocument();
    expect(screen.getByText("Chief Executive Officer")).toBeInTheDocument();
  });

  it("renders fallback departments", () => {
    render(<CompanyAdminOrganization />);
    expect(screen.getAllByText("Engineering").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Marketing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sales").length).toBeGreaterThan(0);
  });

  it("renders department details table", () => {
    render(<CompanyAdminOrganization />);
    expect(screen.getByText("Department")).toBeInTheDocument();
    expect(screen.getByText("Lead Role")).toBeInTheDocument();
    expect(screen.getByText("Headcount")).toBeInTheDocument();
    expect(screen.getByText("% of Org")).toBeInTheDocument();
  });

  it("shows error message with retry on error", () => {
    const { useCompanyDepartments } =
      require("@/hooks/company-admin/useCompanyAdmin");
    (useCompanyDepartments as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<CompanyAdminOrganization />);
    expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useCompanyDepartments } =
      require("@/hooks/company-admin/useCompanyAdmin");
    (useCompanyDepartments as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<CompanyAdminOrganization />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
