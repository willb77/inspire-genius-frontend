/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import DistributorTerritory from "../Territory";

jest.mock("@/layouts/DistributorLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="distributor-layout">{children}</div>,
}));
jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: any) => <div data-testid={`data-card-${title}`}>{children}</div>,
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

const mockUseDistributorTerritory = jest.fn();
jest.mock("@/hooks/distributor/useDistributor", () => ({
  useDistributorTerritory: () => mockUseDistributorTerritory(),
}));

const hookDefaults = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };

describe("DistributorTerritory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDistributorTerritory.mockReturnValue(hookDefaults);
  });

  it("renders page title and description", () => {
    render(<DistributorTerritory />);
    expect(screen.getByText("Territory Management")).toBeInTheDocument();
    expect(screen.getByText(/Manage your geographic regions/)).toBeInTheDocument();
  });

  it("renders placeholder banner", () => {
    render(<DistributorTerritory />);
    expect(screen.getByTestId("placeholder-banner")).toBeInTheDocument();
  });

  it("renders stats from fallback data", () => {
    render(<DistributorTerritory />);
    expect(screen.getByText("Total Regions")).toBeInTheDocument();
    expect(screen.getByText("Active Practitioners")).toBeInTheDocument();
    expect(screen.getByText("Avg Coverage")).toBeInTheDocument();
    expect(screen.getByText("Allocated Credits")).toBeInTheDocument();
  });

  it("renders fallback regions in table", () => {
    render(<DistributorTerritory />);
    expect(screen.getByText("Northeast")).toBeInTheDocument();
    expect(screen.getByText("West Coast")).toBeInTheDocument();
    expect(screen.getByText("Mountain")).toBeInTheDocument();
  });

  it("shows loading skeletons", () => {
    mockUseDistributorTerritory.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<DistributorTerritory />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error state with retry", () => {
    mockUseDistributorTerritory.mockReturnValue({ ...hookDefaults, error: new Error("fail") });
    render(<DistributorTerritory />);
    expect(screen.getByText(/Failed to load territory data/)).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders inside DistributorLayout", () => {
    render(<DistributorTerritory />);
    expect(screen.getByTestId("distributor-layout")).toBeInTheDocument();
  });
});
