/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import CompanyAdminTraining from "../Training";

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

describe("CompanyAdminTraining", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within CompanyAdminLayout", () => {
    render(<CompanyAdminTraining />);
    expect(screen.getByTestId("company-admin-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<CompanyAdminTraining />);
    expect(screen.getByText("Training Programs")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Manage and track organization-wide training initiatives."
      )
    ).toBeInTheDocument();
  });

  it("renders Coming Soon banner", () => {
    render(<CompanyAdminTraining />);
    expect(screen.getByText("Coming Soon")).toBeInTheDocument();
  });

  it("renders summary stat cards", () => {
    render(<CompanyAdminTraining />);
    expect(screen.getByText("Active Programs")).toBeInTheDocument();
    expect(screen.getByText("Total Enrolled")).toBeInTheDocument();
    expect(screen.getByText("Avg Completion")).toBeInTheDocument();
    expect(screen.getByText("Hours Logged")).toBeInTheDocument();
  });

  it("renders fallback training programs", () => {
    render(<CompanyAdminTraining />);
    expect(screen.getByText("PRISM Fundamentals")).toBeInTheDocument();
    expect(screen.getByText("Leadership Essentials")).toBeInTheDocument();
    expect(screen.getByText("Communication Skills")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<CompanyAdminTraining />);
    expect(screen.getByText("Program")).toBeInTheDocument();
    expect(screen.getByText("Enrolled")).toBeInTheDocument();
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getByText("Completion %")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
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

    render(<CompanyAdminTraining />);
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

    render(<CompanyAdminTraining />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
