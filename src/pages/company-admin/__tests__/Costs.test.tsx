/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import CompanyAdminCosts from "../Costs";

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

jest.mock("@/components/dashboard/ProgressBar", () => ({
  __esModule: true,
  default: ({ value }: any) => <div data-testid="progress-bar">{value}%</div>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockRefetch = jest.fn();

jest.mock("@/hooks/company-admin/useCompanyAdmin", () => ({
  useCompanyCosts: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("CompanyAdminCosts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within CompanyAdminLayout", () => {
    render(<CompanyAdminCosts />);
    expect(screen.getByTestId("company-admin-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<CompanyAdminCosts />);
    expect(screen.getByText("Cost Management")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track platform costs, license expenses, and training spend."
      )
    ).toBeInTheDocument();
  });

  it("renders summary stat cards", () => {
    render(<CompanyAdminCosts />);
    expect(screen.getByText("Total Spend (6 mo)")).toBeInTheDocument();
    expect(screen.getByText("License Cost")).toBeInTheDocument();
    expect(screen.getByText("Training Cost")).toBeInTheDocument();
    expect(screen.getByText("Cost per User")).toBeInTheDocument();
  });

  it("renders monthly spend chart section", () => {
    render(<CompanyAdminCosts />);
    expect(
      screen.getByTestId("data-card-Monthly Spend")
    ).toBeInTheDocument();
  });

  it("renders cost by department table", () => {
    render(<CompanyAdminCosts />);
    expect(
      screen.getByTestId("data-card-Cost by Department")
    ).toBeInTheDocument();
    expect(screen.getAllByText("Engineering").length).toBeGreaterThan(0);
  });

  it("renders license allocation section", () => {
    render(<CompanyAdminCosts />);
    expect(screen.getByText("Active Licenses")).toBeInTheDocument();
    expect(screen.getByText("Unused Licenses")).toBeInTheDocument();
    expect(screen.getByText("Pending Activation")).toBeInTheDocument();
  });

  it("shows error message with retry on error", () => {
    const { useCompanyCosts } =
      require("@/hooks/company-admin/useCompanyAdmin");
    (useCompanyCosts as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<CompanyAdminCosts />);
    expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useCompanyCosts } =
      require("@/hooks/company-admin/useCompanyAdmin");
    (useCompanyCosts as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<CompanyAdminCosts />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
