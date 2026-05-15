/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import PractitionerCredits from "../Credits";

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}));
jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: any) => <div data-testid={`data-card-${title}`}>{children}</div>,
}));
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockUsePractitionerCredits = jest.fn();
jest.mock("@/hooks/practitioner/usePractitioner", () => ({
  usePractitionerCredits: () => mockUsePractitionerCredits(),
}));

const hookDefaults = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };

describe("PractitionerCredits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePractitionerCredits.mockReturnValue(hookDefaults);
  });

  it("renders page title and description", () => {
    render(<PractitionerCredits />);
    expect(screen.getByText("Credit Management")).toBeInTheDocument();
    expect(screen.getByText(/Track and manage your PRISM assessment credits/)).toBeInTheDocument();
  });

  it("renders credit stat cards with fallback values", () => {
    render(<PractitionerCredits />);
    expect(screen.getByText("Credits Remaining")).toBeInTheDocument();
    expect(screen.getByText("Total Purchased")).toBeInTheDocument();
    expect(screen.getByText("Used This Month")).toBeInTheDocument();
    expect(screen.getByText("Avg Monthly Usage")).toBeInTheDocument();
    expect(screen.getAllByText("38").length).toBeGreaterThan(0);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("shows loading skeletons for stats", () => {
    mockUsePractitionerCredits.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<PractitionerCredits />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders monthly usage chart bars", () => {
    render(<PractitionerCredits />);
    expect(screen.getByText("Oct")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();
  });

  it("renders transaction history table", () => {
    render(<PractitionerCredits />);
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
  });

  it("renders fallback transaction rows", () => {
    render(<PractitionerCredits />);
    expect(screen.getByText("Marcus Chen")).toBeInTheDocument();
    expect(screen.getAllByText("Purchased").length).toBeGreaterThan(0);
  });

  it("shows error state with retry", () => {
    mockUsePractitionerCredits.mockReturnValue({ ...hookDefaults, error: new Error("fail") });
    render(<PractitionerCredits />);
    expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders Request Credits button", () => {
    render(<PractitionerCredits />);
    expect(screen.getByText("Request Credits")).toBeInTheDocument();
  });
});
