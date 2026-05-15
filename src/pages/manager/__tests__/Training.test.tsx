/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerTraining from "../Training";

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

jest.mock("@/components/dashboard/ProgressBar", () => ({
  __esModule: true,
  default: ({ value }: any) => <div data-testid="progress-bar">{value}%</div>,
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
  useManagerTraining: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("ManagerTraining", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerTraining />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<ManagerTraining />);
    expect(screen.getByText("Training")).toBeInTheDocument();
    expect(
      screen.getByText("Manage training programs and track team completion.")
    ).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    render(<ManagerTraining />);
    expect(screen.getByText("Active Programs")).toBeInTheDocument();
    expect(screen.getByText("Total Enrolled")).toBeInTheDocument();
    expect(screen.getByText("Avg Completion")).toBeInTheDocument();
    expect(screen.getByText("PRISM Recommended")).toBeInTheDocument();
  });

  it("renders fallback training programs in table", () => {
    render(<ManagerTraining />);
    expect(screen.getByText("Leadership Foundations")).toBeInTheDocument();
    expect(screen.getByText("Effective Communication")).toBeInTheDocument();
    expect(screen.getByText("Technical Skills Workshop")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<ManagerTraining />);
    expect(screen.getByText("Program")).toBeInTheDocument();
    expect(screen.getByText("Enrolled")).toBeInTheDocument();
    expect(screen.getByText("Completion")).toBeInTheDocument();
    expect(screen.getByText("PRISM Recommendation")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("shows error message with retry", () => {
    const { useManagerTraining } = require("@/hooks/manager/useManagerTeam");
    (useManagerTraining as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<ManagerTraining />);
    expect(
      screen.getByText("Failed to load training programs.")
    ).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useManagerTraining } = require("@/hooks/manager/useManagerTeam");
    (useManagerTraining as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerTraining />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
