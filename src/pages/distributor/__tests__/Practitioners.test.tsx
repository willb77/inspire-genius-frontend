/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import DistributorPractitioners from "../Practitioners";

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
  default: ({ label }: any) => <span data-testid="status-badge">{label}</span>,
}));
jest.mock("@/components/dashboard/ProgressBar", () => ({
  __esModule: true,
  default: ({ value }: any) => <div data-testid="progress-bar">{value}%</div>,
}));
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockUseDistributorPractitioners = jest.fn();
jest.mock("@/hooks/distributor/useDistributor", () => ({
  useDistributorPractitioners: () => mockUseDistributorPractitioners(),
}));

const hookDefaults = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };

describe("DistributorPractitioners", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDistributorPractitioners.mockReturnValue(hookDefaults);
  });

  it("renders page title and description", () => {
    render(<DistributorPractitioners />);
    expect(screen.getByText("Practitioner Network")).toBeInTheDocument();
    expect(screen.getByText(/Manage practitioners in your territory/)).toBeInTheDocument();
  });

  it("renders Onboard Practitioner button", () => {
    render(<DistributorPractitioners />);
    expect(screen.getByText("+ Onboard Practitioner")).toBeInTheDocument();
  });

  it("renders summary stats", () => {
    render(<DistributorPractitioners />);
    expect(screen.getByText("Total Practitioners")).toBeInTheDocument();
    expect(screen.getByText("Total Clients Served")).toBeInTheDocument();
    expect(screen.getByText("Avg Utilization")).toBeInTheDocument();
  });

  it("renders fallback practitioners", () => {
    render(<DistributorPractitioners />);
    expect(screen.getAllByText("Dr. Sarah Chen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Northeast").length).toBeGreaterThan(0);
  });

  it("shows loading skeletons", () => {
    mockUseDistributorPractitioners.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<DistributorPractitioners />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error state", () => {
    mockUseDistributorPractitioners.mockReturnValue({ ...hookDefaults, error: new Error("fail") });
    render(<DistributorPractitioners />);
    expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
  });

  it("filters practitioners by search", () => {
    render(<DistributorPractitioners />);
    const search = screen.getByPlaceholderText("Search by name or region...");
    fireEvent.change(search, { target: { value: "Sarah" } });
    expect(screen.getByText("Dr. Sarah Chen")).toBeInTheDocument();
    expect(screen.queryByText("Michael Torres")).not.toBeInTheDocument();
  });

  it("renders region cards", () => {
    render(<DistributorPractitioners />);
    expect(screen.getAllByText("Southeast").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Midwest").length).toBeGreaterThan(0);
    expect(screen.getAllByText("West Coast").length).toBeGreaterThan(0);
  });
});
