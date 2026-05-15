/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import ManagerJobDna from "../JobDna";

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

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetch,
  })),
}));

jest.mock("@/services/job-blueprint/job-dna.service", () => ({
  jobDnaService: { list: jest.fn() },
}));

describe("ManagerJobDna", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerJobDna />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<ManagerJobDna />);
    expect(screen.getByText("Job DNA")).toBeInTheDocument();
    expect(
      screen.getByText("PRISM-based job profiles and candidate matching criteria.")
    ).toBeInTheDocument();
  });

  it("renders fallback job profiles", () => {
    render(<ManagerJobDna />);
    expect(screen.getAllByText("Frontend Developer").length).toBeGreaterThan(0);
    expect(screen.getByText("Product Manager")).toBeInTheDocument();
    expect(screen.getByText("Data Analyst")).toBeInTheDocument();
    expect(screen.getByText("UX Designer")).toBeInTheDocument();
    expect(screen.getByText("DevOps Engineer")).toBeInTheDocument();
  });

  it("renders grid headers", () => {
    render(<ManagerJobDna />);
    expect(screen.getByText("Position")).toBeInTheDocument();
    expect(screen.getByText("PRISM Profile")).toBeInTheDocument();
    expect(screen.getByText("Key Traits")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("expands job row on click to show PRISM breakdown", () => {
    render(<ManagerJobDna />);
    const frontendRow = screen.getAllByText("Frontend Developer")[0];
    fireEvent.click(frontendRow.closest("button")!);
    expect(screen.getByText("PRISM Dimension Breakdown")).toBeInTheDocument();
  });

  it("shows skeletons when loading", () => {
    const { useQuery } = require("@tanstack/react-query");
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    });

    render(<ManagerJobDna />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error message with retry on error", () => {
    const { useQuery } = require("@tanstack/react-query");
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("fail"),
      refetch: mockRefetch,
    });

    render(<ManagerJobDna />);
    expect(
      screen.getByText("Failed to load Job DNA profiles.")
    ).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });
});
