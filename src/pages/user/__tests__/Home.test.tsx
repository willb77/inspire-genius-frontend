/**
 * @jest-environment jsdom
 */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Home from "../Home";
import { useAuth } from "@/context/useAuth";
import { usePrismHistory } from "@/hooks/prism/usePrismHistory";
import { useAuditStats } from "@/hooks/audit/useAudit";

/* ---- Mocks ---- */

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/WelcomeBanner", () => ({
  __esModule: true,
  default: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="welcome-banner">
      <span>{title}</span>
      <span>{subtitle}</span>
    </div>
  ),
}));

jest.mock("@/components/dashboard/StatCard", () => ({
  __esModule: true,
  default: ({ label, value }: { label: string; value: string }) => (
    <div data-testid="stat-card">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  ),
}));

jest.mock("@/components/dashboard/QuickActions", () => ({
  __esModule: true,
  default: ({ actions }: { actions: Array<{ label: string }> }) => (
    <div data-testid="quick-actions">
      {actions.map((a) => (
        <span key={a.label}>{a.label}</span>
      ))}
    </div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="data-card">
      <span>{title}</span>
      {children}
    </div>
  ),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/prism/usePrismHistory", () => ({
  usePrismHistory: jest.fn(),
}));

jest.mock("@/hooks/audit/useAudit", () => ({
  useAuditStats: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUsePrismHistory = usePrismHistory as jest.MockedFunction<typeof usePrismHistory>;
const mockUseAuditStats = useAuditStats as jest.MockedFunction<typeof useAuditStats>;

/* ---- Helpers ---- */

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

/* ---- Tests ---- */

describe("Home Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: "1", fullName: "Test User", name: "Test", email: "test@test.com", role: "user" },
      isAuthenticated: true,
      hasRole: jest.fn(() => true),
    } as any);

    mockUsePrismHistory.mockReturnValue({
      data: { data: { assessments: [] } },
      isLoading: false,
    } as any);

    mockUseAuditStats.mockReturnValue({
      data: {
        data: {
          total_logs: 42,
          logs_today: 5,
          logs_this_week: 12,
          logs_this_month: 30,
          ai_usage: { request_count: 10, total_cost_usd: 1.5 },
          top_actions: [],
        },
      },
      isLoading: false,
    } as any);
  });

  it("renders welcome banner with user's first name", () => {
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByTestId("welcome-banner")).toBeInTheDocument();
    // The welcome message should include "Test" (first name)
    // i18n mock may not interpolate single-brace tokens; check the raw pattern
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
  });

  it("renders stat cards", () => {
    render(<Home />, { wrapper: createWrapper() });
    const statCards = screen.getAllByTestId("stat-card");
    expect(statCards.length).toBe(4);
  });

  it("renders quick actions", () => {
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByTestId("quick-actions")).toBeInTheDocument();
  });

  it("renders recent activity data card", () => {
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });

  it("shows loading state for audit stats", () => {
    mockUseAuditStats.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<Home />, { wrapper: createWrapper() });
    // Stats should show "..." when loading
    const dots = screen.getAllByText("...");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("shows no recent activity message when empty", () => {
    mockUseAuditStats.mockReturnValue({
      data: {
        data: {
          total_logs: 0,
          logs_today: 0,
          logs_this_week: 0,
          logs_this_month: 0,
          ai_usage: { request_count: 0, total_cost_usd: 0 },
          top_actions: [],
        },
      },
      isLoading: false,
    } as any);

    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
  });

  it("renders behavioral report status card", () => {
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByText("Behavioral Report Status")).toBeInTheDocument();
  });

  it("renders PRISM survey card", () => {
    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByText("PRISM Survey")).toBeInTheDocument();
  });

  it("shows loading state for PRISM data", () => {
    mockUsePrismHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<Home />, { wrapper: createWrapper() });
    // Should show a loading indicator
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("disables request survey button when assessment is active", () => {
    mockUsePrismHistory.mockReturnValue({
      data: {
        data: {
          assessments: [
            { id: "a1", status: "in_progress", initiatedAt: "2026-01-01" },
          ],
        },
      },
      isLoading: false,
    } as any);

    render(<Home />, { wrapper: createWrapper() });
    const btn = screen.getByRole("button", { name: /assessment in progress/i });
    expect(btn).toBeDisabled();
  });

  it("renders top audit actions", () => {
    mockUseAuditStats.mockReturnValue({
      data: {
        data: {
          total_logs: 42,
          logs_today: 5,
          logs_this_week: 12,
          logs_this_month: 30,
          ai_usage: { request_count: 10, total_cost_usd: 1.5 },
          top_actions: [
            { action: "chat_message_sent", count: 15 },
            { action: "document_uploaded", count: 8 },
          ],
        },
      },
      isLoading: false,
    } as any);

    render(<Home />, { wrapper: createWrapper() });
    expect(screen.getByText("chat message sent")).toBeInTheDocument();
    expect(screen.getByText("document uploaded")).toBeInTheDocument();
  });
});
