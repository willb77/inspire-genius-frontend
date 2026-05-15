/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import ManagerCandidates from "../Candidates";

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
  useManagerCandidates: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
  useManagerHiringStats: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

describe("ManagerCandidates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerCandidates />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<ManagerCandidates />);
    expect(screen.getByText("Candidates")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Browse and manage candidates across your hiring pipeline."
      )
    ).toBeInTheDocument();
  });

  it("renders stage filter buttons", () => {
    render(<ManagerCandidates />);
    expect(screen.getByText("All")).toBeInTheDocument();
    // Screening/Assessment/Interview/Offer appear as both filter buttons and stage badges
    expect(screen.getAllByText("Screening").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Assessment").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Interview").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Offer").length).toBeGreaterThanOrEqual(2);
  });

  it("renders fallback candidates table", () => {
    render(<ManagerCandidates />);
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("Elena Rodriguez")).toBeInTheDocument();
    expect(screen.getByText("Tom Harris")).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    render(<ManagerCandidates />);
    expect(screen.getByText("Total Candidates")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Interview Stage")).toBeInTheDocument();
    expect(screen.getByText("Offers Extended")).toBeInTheDocument();
  });

  it("filters candidates by stage when filter button clicked", () => {
    render(<ManagerCandidates />);
    // The filter buttons are the first occurrence; stage badges also contain the text
    const offerButtons = screen.getAllByText("Offer");
    fireEvent.click(offerButtons[0]);
    // Only Tom Harris is in Offer stage
    expect(screen.getByText("Tom Harris")).toBeInTheDocument();
    // Sarah Chen is in Interview stage, should not appear
    expect(screen.queryByText("Sarah Chen")).not.toBeInTheDocument();
  });

  it("shows all candidates when All filter selected", () => {
    render(<ManagerCandidates />);
    const offerButtons = screen.getAllByText("Offer");
    fireEvent.click(offerButtons[0]);
    fireEvent.click(screen.getByText("All"));
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("Tom Harris")).toBeInTheDocument();
  });

  it("shows error state with retry", () => {
    const { useManagerCandidates } = require("@/hooks/manager/useManagerTeam");
    (useManagerCandidates as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<ManagerCandidates />);
    expect(screen.getByText("Failed to load candidates.")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useManagerCandidates, useManagerHiringStats } =
      require("@/hooks/manager/useManagerTeam");
    (useManagerCandidates as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });
    (useManagerHiringStats as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerCandidates />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });
});
