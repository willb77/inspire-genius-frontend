/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerCareerManagement from "../CareerManagement";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
  ),
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
  useManagerCareerPaths: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("ManagerCareerManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerCareerManagement />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<ManagerCareerManagement />);
    expect(screen.getByText("Career Management")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Track career paths, skill gaps, and PRISM alignment for your team."
      )
    ).toBeInTheDocument();
  });

  it("renders fallback career path cards", () => {
    render(<ManagerCareerManagement />);
    expect(screen.getByText("Alex Thompson")).toBeInTheDocument();
    expect(screen.getByText("Maria Garcia")).toBeInTheDocument();
    expect(screen.getByText("James Wilson")).toBeInTheDocument();
  });

  it("renders career progression info", () => {
    render(<ManagerCareerManagement />);
    // Career role text is split by arrow entity, so use partial match
    expect(screen.getByText(/Senior Developer/)).toBeInTheDocument();
    expect(screen.getByText(/Tech Lead/)).toBeInTheDocument();
  });

  it("renders skill gap indicators", () => {
    render(<ManagerCareerManagement />);
    expect(screen.getByText("Architecture")).toBeInTheDocument();
    expect(screen.getByText("Mentoring")).toBeInTheDocument();
    expect(screen.getByText("Strategy")).toBeInTheDocument();
  });

  it("renders PRISM alignment percentages", () => {
    render(<ManagerCareerManagement />);
    // Multiple cards show percentage values
    expect(screen.getAllByText("85%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("78%").length).toBeGreaterThan(0);
  });

  it("shows error message with retry on error", () => {
    const { useManagerCareerPaths } = require("@/hooks/manager/useManagerTeam");
    (useManagerCareerPaths as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<ManagerCareerManagement />);
    expect(screen.getByText("Failed to load career paths.")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useManagerCareerPaths } = require("@/hooks/manager/useManagerTeam");
    (useManagerCareerPaths as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerCareerManagement />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
