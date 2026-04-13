/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import CompanyAdminLeadership from "../Leadership";

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
  useCompanyAnalytics: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("CompanyAdminLeadership", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within CompanyAdminLayout", () => {
    render(<CompanyAdminLeadership />);
    expect(screen.getByTestId("company-admin-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<CompanyAdminLeadership />);
    expect(screen.getByText("Leadership Development")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track leadership pipelines, high-potential talent, and development programs."
      )
    ).toBeInTheDocument();
  });

  it("renders Coming Soon banner", () => {
    render(<CompanyAdminLeadership />);
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });

  it("renders summary stat cards", () => {
    render(<CompanyAdminLeadership />);
    expect(screen.getByText("Leadership Pipeline")).toBeInTheDocument();
    expect(screen.getByText("High Potential")).toBeInTheDocument();
    expect(screen.getByText("Active Programs")).toBeInTheDocument();
    expect(screen.getByText("Avg Leadership Score")).toBeInTheDocument();
  });

  it("renders fallback leaders in table", () => {
    render(<CompanyAdminLeadership />);
    expect(screen.getByText("Alex Thompson")).toBeInTheDocument();
    expect(screen.getByText("Maria Garcia")).toBeInTheDocument();
    expect(screen.getByText("James Wilson")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<CompanyAdminLeadership />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Department")).toBeInTheDocument();
    expect(screen.getByText("Leadership Score")).toBeInTheDocument();
    expect(screen.getByText("Potential")).toBeInTheDocument();
    expect(screen.getByText("Programs Completed")).toBeInTheDocument();
  });

  it("shows error message with retry on error", () => {
    const { useCompanyAnalytics } =
      require("@/hooks/company-admin/useCompanyAdmin");
    (useCompanyAnalytics as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<CompanyAdminLeadership />);
    expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useCompanyAnalytics } =
      require("@/hooks/company-admin/useCompanyAdmin");
    (useCompanyAnalytics as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<CompanyAdminLeadership />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
