/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerHiring from "../Hiring";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, badge, children }: any) => (
    <div data-testid={`data-card-${title}`}>
      {badge != null && <span data-testid="badge">{badge}</span>}
      {children}
    </div>
  ),
}));

jest.mock("@/components/dashboard/StatusBadge", () => ({
  __esModule: true,
  default: ({ label }: any) => <span data-testid="status-badge">{label}</span>,
}));

jest.mock("@/components/dashboard/PlaceholderBanner", () => ({
  __esModule: true,
  default: () => <div data-testid="placeholder-banner" />,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockRefetch = jest.fn();

jest.mock("@/hooks/manager/useManagerTeam", () => ({
  useManagerHiringStats: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
  useManagerInterviews: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("ManagerHiring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerHiring />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading and description", () => {
    render(<ManagerHiring />);
    expect(screen.getByText("Hiring Pipeline")).toBeInTheDocument();
    expect(
      screen.getByText("Track candidates, interviews, and Job DNA matching.")
    ).toBeInTheDocument();
  });

  it("renders pipeline stat labels", () => {
    render(<ManagerHiring />);
    expect(screen.getByText("Open Positions")).toBeInTheDocument();
    expect(screen.getByText("Total Candidates")).toBeInTheDocument();
    expect(screen.getByText("Interviews This Week")).toBeInTheDocument();
    expect(screen.getByText("Avg Time to Hire")).toBeInTheDocument();
  });

  it("renders candidates table with fallback data", () => {
    render(<ManagerHiring />);
    // Sarah Chen and Frontend Developer appear in both candidates and interviews
    expect(screen.getAllByText("Sarah Chen").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Frontend Developer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Elena Rodriguez")).toBeInTheDocument();
  });

  it("renders candidate table headers", () => {
    render(<ManagerHiring />);
    expect(screen.getAllByText("Candidate").length).toBeGreaterThan(0);
    // Position appears both as header and as data cells
    expect(screen.getAllByText("Position").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stage").length).toBeGreaterThan(0);
  });

  it("renders today's interviews with fallback data", () => {
    render(<ManagerHiring />);
    expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    // Multiple "Technical" entries exist (both interview type and table text)
    expect(screen.getAllByText("Technical").length).toBeGreaterThan(0);
  });

  it("renders Job DNA profiles table", () => {
    render(<ManagerHiring />);
    expect(screen.getByText("PRISM Profile")).toBeInTheDocument();
    expect(screen.getByText("Key Traits")).toBeInTheDocument();
    expect(screen.getByText("Detail-oriented, Collaborative")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useManagerHiringStats, useManagerInterviews } =
      require("@/hooks/manager/useManagerTeam");

    (useManagerHiringStats as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    (useManagerInterviews as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerHiring />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
