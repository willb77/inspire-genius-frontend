/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import PractitionerDashboard from "../Dashboard";

/* ---- layout ---- */
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}));

/* ---- child components ---- */
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

/* ---- hooks ---- */
const mockUsePractitionerSessions = jest.fn();
const mockUsePractitionerClients = jest.fn();
const mockUsePractitionerFollowups = jest.fn();
const mockUsePractitionerCredits = jest.fn();

jest.mock("@/hooks/practitioner/usePractitioner", () => ({
  usePractitionerSessions: () => mockUsePractitionerSessions(),
  usePractitionerClients: () => mockUsePractitionerClients(),
  usePractitionerFollowups: () => mockUsePractitionerFollowups(),
  usePractitionerCredits: () => mockUsePractitionerCredits(),
}));

/* ---- i18n ---- */
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const hookDefaults = { data: undefined, isLoading: false, error: null, refetch: jest.fn() };

describe("PractitionerDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePractitionerSessions.mockReturnValue(hookDefaults);
    mockUsePractitionerClients.mockReturnValue(hookDefaults);
    mockUsePractitionerFollowups.mockReturnValue(hookDefaults);
    mockUsePractitionerCredits.mockReturnValue(hookDefaults);
  });

  it("renders inside PractitionerLayout", () => {
    render(<PractitionerDashboard />);
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument();
  });

  it("renders welcome banner", () => {
    render(<PractitionerDashboard />);
    expect(screen.getByTestId("welcome-banner")).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    render(<PractitionerDashboard />);
    expect(screen.getAllByText("coaching:practitioner.activeClients").length).toBeGreaterThan(0);
    expect(screen.getByText("coaching:practitioner.creditsRemaining")).toBeInTheDocument();
    expect(screen.getByText("coaching:practitioner.sessionsThisMonth")).toBeInTheDocument();
  });

  it("renders fallback sessions when data is undefined", () => {
    render(<PractitionerDashboard />);
    expect(screen.getAllByText("Marcus Chen").length).toBeGreaterThan(0);
    expect(screen.getByText("PRISM Debrief")).toBeInTheDocument();
  });

  it("shows skeletons while sessions are loading", () => {
    mockUsePractitionerSessions.mockReturnValue({ ...hookDefaults, isLoading: true });
    render(<PractitionerDashboard />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows error message and retry button on sessions error", () => {
    mockUsePractitionerSessions.mockReturnValue({ ...hookDefaults, error: new Error("fail") });
    render(<PractitionerDashboard />);
    expect(screen.getByText("Failed to load data.")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });

  it("renders fallback follow-ups", () => {
    render(<PractitionerDashboard />);
    expect(screen.getByText("Post-assessment review")).toBeInTheDocument();
  });

  it("renders credit usage bars", () => {
    render(<PractitionerDashboard />);
    expect(screen.getByText("Oct")).toBeInTheDocument();
    expect(screen.getByText("Mar")).toBeInTheDocument();
  });
});
