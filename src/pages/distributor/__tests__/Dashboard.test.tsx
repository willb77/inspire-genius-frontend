/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DistributorDashboard from "../Dashboard";

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DistributorDashboard />
    </MemoryRouter>
  );

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
    renderDashboard();
    expect(screen.getByTestId("distributor-layout")).toBeInTheDocument();
  });

  it("renders welcome banner", () => {
    renderDashboard();
    expect(screen.getByTestId("welcome-banner")).toBeInTheDocument();
  });

  it("renders credit stat cards", () => {
    renderDashboard();
    expect(screen.getByText("admin:distributor.totalPurchased")).toBeInTheDocument();
    expect(screen.getByText("admin:distributor.totalAllocated")).toBeInTheDocument();
    expect(screen.getByText("admin:distributor.availablePool")).toBeInTheDocument();
  });

  it("renders top practitioners summary linking to Network hub", () => {
    renderDashboard();
    const link = screen.getByTestId("top-practitioners-summary-link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/distributor/network?tab=practitioners");
    expect(screen.getByText(/Dr\. Sarah Chen leads with/)).toBeInTheDocument();
  });

  it("renders practitioner network table", () => {
    renderDashboard();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Region")).toBeInTheDocument();
    expect(screen.getByText("Allocated")).toBeInTheDocument();
  });

  it("shows loading skeletons for practitioners", () => {
    mockUseDistributorPractitioners.mockReturnValue({ ...hookDefaults, isLoading: true });
    renderDashboard();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error state for practitioners", () => {
    mockUseDistributorPractitioners.mockReturnValue({ ...hookDefaults, error: new Error("fail") });
    renderDashboard();
    expect(screen.getAllByText("Failed to load data.").length).toBeGreaterThan(0);
  });

  it("shows loading skeletons for transactions", () => {
    mockUseDistributorTransactions.mockReturnValue({ ...hookDefaults, isLoading: true });
    renderDashboard();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders fallback transactions", () => {
    renderDashboard();
    expect(screen.getAllByText("Purchase").length).toBeGreaterThan(0);
    expect(screen.getAllByText("+500").length).toBeGreaterThan(0);
  });

  it("renders credit usage trend bars", () => {
    renderDashboard();
    expect(screen.getByText("Sep")).toBeInTheDocument();
    expect(screen.getByText("Feb")).toBeInTheDocument();
  });
});

// N-4 — a distributor can be a blueprint-validation reviewer (backend #1830),
// so the reviewer's queue is mounted here. The REAL ValidationReviewQueue runs;
// only its data hooks are stubbed, so these tests prove the mount and the gate.
const mockValidationEnabled = jest.fn(() => false);
const mockAwaitingValidation = jest.fn<{ data: unknown[] | undefined }, []>(() => ({ data: undefined }));
jest.mock("@/hooks/job-blueprint/useBlueprintValidation", () => ({
  useValidationEnabled: () => mockValidationEnabled(),
  useAwaitingValidation: () => mockAwaitingValidation(),
  useRationale: () => ({ data: undefined, isLoading: false, isError: false }),
}));

describe("DistributorDashboard — N-4 reviewer queue", () => {
  const waiting = {
    blueprintId: "bp1", roleTitle: "Line Supervisor", version: 1, requestedBy: "Test Editor",
    requestedAt: "2026-10-19T10:00:00", note: null,
  };

  beforeEach(() => {
    mockUseDistributorPractitioners.mockReturnValue(hookDefaults);
    mockUseDistributorCredits.mockReturnValue(hookDefaults);
    mockUseDistributorTransactions.mockReturnValue(hookDefaults);
  });

  it("shows the queue when blueprint_validation is on and a request is waiting", () => {
    mockValidationEnabled.mockReturnValue(true);
    mockAwaitingValidation.mockReturnValue({ data: [waiting] });
    renderDashboard();
    expect(screen.getByTestId("validation-review-queue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Line Supervisor/ })).toBeInTheDocument();
  });

  it("renders no queue when blueprint_validation is off", () => {
    mockValidationEnabled.mockReturnValue(false);
    mockAwaitingValidation.mockReturnValue({ data: [waiting] });
    renderDashboard();
    expect(screen.queryByTestId("validation-review-queue")).not.toBeInTheDocument();
    expect(screen.getByTestId("distributor-layout")).toBeInTheDocument();
  });
});
