/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import DistributorCredits from "../Credits";

jest.mock("@/layouts/DistributorLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="distributor-layout">{children}</div>,
}));
jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: any) => <div data-testid={`data-card-${title}`}>{children}</div>,
}));
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockUseDistributorCredits = jest.fn();
const mockUseDistributorTransactions = jest.fn();
jest.mock("@/hooks/distributor/useDistributor", () => ({
  useDistributorCredits: () => mockUseDistributorCredits(),
  useDistributorTransactions: () => mockUseDistributorTransactions(),
}));

const hookDefaults = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };

describe("DistributorCredits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDistributorCredits.mockReturnValue(hookDefaults);
    mockUseDistributorTransactions.mockReturnValue(hookDefaults);
  });

  it("renders page title and description", () => {
    render(<DistributorCredits />);
    expect(screen.getByText("Credit Management")).toBeInTheDocument();
    expect(screen.getByText(/Purchase, allocate, and track PRISM assessment credits/)).toBeInTheDocument();
  });

  it("renders Purchase Credits button", () => {
    render(<DistributorCredits />);
    expect(screen.getByText("Purchase Credits")).toBeInTheDocument();
  });

  it("renders credit summary stats", () => {
    render(<DistributorCredits />);
    expect(screen.getByText("Total Purchased")).toBeInTheDocument();
    expect(screen.getByText("Total Allocated")).toBeInTheDocument();
    expect(screen.getByText("Available Pool")).toBeInTheDocument();
    expect(screen.getByText("Used by Practitioners")).toBeInTheDocument();
  });

  it("shows loading skeletons for credits", () => {
    mockUseDistributorCredits.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<DistributorCredits />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders credit usage trend bars", () => {
    render(<DistributorCredits />);
    expect(screen.getByText("Sep")).toBeInTheDocument();
    expect(screen.getByText("Feb")).toBeInTheDocument();
  });

  it("renders allocations by practitioner", () => {
    render(<DistributorCredits />);
    expect(screen.getByText("Dr. Sarah Chen")).toBeInTheDocument();
    expect(screen.getByText("Michael Torres")).toBeInTheDocument();
  });

  it("renders transaction history table", () => {
    render(<DistributorCredits />);
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
  });

  it("shows error state for transactions", () => {
    mockUseDistributorTransactions.mockReturnValue({ ...hookDefaults, error: new Error("fail") });
    render(<DistributorCredits />);
    expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
  });
});
