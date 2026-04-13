/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerTeamBuilding from "../TeamBuilding";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
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
  default: ({ label }: any) => <div data-testid="progress-bar">{label}</div>,
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
  useManagerTeamComposition: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("ManagerTeamBuilding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerTeamBuilding />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<ManagerTeamBuilding />);
    expect(screen.getByText("Team Building")).toBeInTheDocument();
    expect(
      screen.getByText(
        "PRISM team composition, conflict insights, and collaboration suggestions."
      )
    ).toBeInTheDocument();
  });

  it("renders team composition table with fallback data", () => {
    render(<ManagerTeamBuilding />);
    expect(screen.getByText("Alex Thompson")).toBeInTheDocument();
    expect(screen.getByText("Senior Developer")).toBeInTheDocument();
    expect(screen.getByText("Maria Garcia")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<ManagerTeamBuilding />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Secondary")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
  });

  it("renders conflict insights section", () => {
    render(<ManagerTeamBuilding />);
    expect(
      screen.getByText(/Gold-Orange tension/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Blue-heavy team/)
    ).toBeInTheDocument();
  });

  it("renders collaboration suggestions section", () => {
    render(<ManagerTeamBuilding />);
    expect(
      screen.getByText(/James Wilson.*Maria Garcia/)
    ).toBeInTheDocument();
  });

  it("shows error state with retry", () => {
    const { useManagerTeamComposition } =
      require("@/hooks/manager/useManagerTeam");
    (useManagerTeamComposition as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<ManagerTeamBuilding />);
    expect(screen.getByText("Failed to load team data.")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useManagerTeamComposition } =
      require("@/hooks/manager/useManagerTeam");
    (useManagerTeamComposition as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerTeamBuilding />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
