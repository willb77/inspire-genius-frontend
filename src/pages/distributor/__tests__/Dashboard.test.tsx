/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import DistributorDashboard from "../Dashboard";

jest.mock("@/layouts/DistributorLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="distributor-layout">{children}</div>,
}));
jest.mock("@/components/dashboard/WelcomeBanner", () => ({
  __esModule: true,
  default: ({ title, subtitle, children }: any) => (
    <div data-testid="welcome-banner">
      <span>{title}</span>
      <span>{subtitle}</span>
      {children}
    </div>
  ),
}));
jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: any) => <div data-testid={`data-card-${title}`}>{children}</div>,
}));
jest.mock("@/components/dashboard/StatusBadge", () => ({
  __esModule: true,
  default: ({ label }: any) => <span data-testid="status-badge">{label}</span>,
}));
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockUseDistributorPractitioners = jest.fn();
const mockUseDistributorCredits = jest.fn();
const mockUseDistributorTransactions = jest.fn();

jest.mock("@/hooks/distributor/useDistributor", () => ({
  useDistributorPractitioners: () => mockUseDistributorPractitioners(),
  useDistributorCredits: () => mockUseDistributorCredits(),
  useDistributorTransactions: () => mockUseDistributorTransactions(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const hookDefaults = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };

describe("DistributorDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDistributorPractitioners.mockReturnValue(hookDefaults);
    mockUseDistributorCredits.mockReturnValue(hookDefaults);
    mockUseDistributorTransactions.mockReturnValue(hookDefaults);
  });

  it("renders inside DistributorLayout", () => {
    render(<DistributorDashboard />);
    expect(screen.getByTestId("distributor-layout")).toBeInTheDocument();
  });

  it("renders welcome banner", () => {
    render(<DistributorDashboard />);
    expect(screen.getByTestId("welcome-banner")).toBeInTheDocument();
  });

  it("renders credit stat cards", () => {
    render(<DistributorDashboard />);
    expect(screen.getByText("admin:distributor.totalPurchased")).toBeInTheDocument();
    expect(screen.getByText("admin:distributor.totalAllocated")).toBeInTheDocument();
    expect(screen.getByText("admin:distributor.availablePool")).toBeInTheDocument();
  });

  it("renders top practitioners", () => {
    render(<DistributorDashboard />);
    expect(screen.getAllByText("Dr. Sarah Chen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Michael Torres").length).toBeGreaterThan(0);
  });

  it("renders practitioner network table", () => {
    render(<DistributorDashboard />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Region")).toBeInTheDocument();
    expect(screen.getByText("Allocated")).toBeInTheDocument();
  });

  it("shows loading skeletons for practitioners", () => {
    mockUseDistributorPractitioners.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<DistributorDashboard />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error state for practitioners", () => {
    mockUseDistributorPractitioners.mockReturnValue({ ...hookDefaults, error: new Error("fail") });
    render(<DistributorDashboard />);
    expect(screen.getAllByText("Failed to load data.").length).toBeGreaterThan(0);
  });

  it("shows loading skeletons for transactions", () => {
    mockUseDistributorTransactions.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<DistributorDashboard />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders fallback transactions", () => {
    render(<DistributorDashboard />);
    expect(screen.getAllByText("Purchase").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+500").length).toBeGreaterThan(0);
  });

  it("renders credit usage trend bars", () => {
    render(<DistributorDashboard />);
    expect(screen.getByText("Sep")).toBeInTheDocument();
    expect(screen.getByText("Feb")).toBeInTheDocument();
  });
});
