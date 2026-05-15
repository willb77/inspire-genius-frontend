/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerInterviews from "../Interviews";

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
  default: ({ status }: any) => <span data-testid="status-badge">{status}</span>,
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
  useManagerInterviewSchedule: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("ManagerInterviews", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerInterviews />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<ManagerInterviews />);
    expect(screen.getByText("Interviews")).toBeInTheDocument();
    expect(
      screen.getByText("Schedule and track candidate interviews.")
    ).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    render(<ManagerInterviews />);
    expect(screen.getByText("Today's Interviews")).toBeInTheDocument();
    expect(screen.getByText("This Week")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders interview groups with fallback data", () => {
    render(<ManagerInterviews />);
    // Today group interviews
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("Marcus Johnson")).toBeInTheDocument();
    // Tomorrow group
    expect(screen.getByText("Elena Rodriguez")).toBeInTheDocument();
    // This Week group
    expect(screen.getByText("Lisa Wang")).toBeInTheDocument();
  });

  it("renders table headers in interview groups", () => {
    render(<ManagerInterviews />);
    const timeHeaders = screen.getAllByText("Time");
    expect(timeHeaders.length).toBeGreaterThan(0);
    const candidateHeaders = screen.getAllByText("Candidate");
    expect(candidateHeaders.length).toBeGreaterThan(0);
  });

  it("renders interview types", () => {
    render(<ManagerInterviews />);
    // Multiple Technical/Behavioral entries exist across groups
    expect(screen.getAllByText("Technical").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Behavioral").length).toBeGreaterThan(0);
  });

  it("shows error message with retry on error", () => {
    const { useManagerInterviewSchedule } =
      require("@/hooks/manager/useManagerTeam");
    (useManagerInterviewSchedule as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<ManagerInterviews />);
    expect(
      screen.getByText("Failed to load interview schedule.")
    ).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useManagerInterviewSchedule } =
      require("@/hooks/manager/useManagerTeam");
    (useManagerInterviewSchedule as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerInterviews />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
