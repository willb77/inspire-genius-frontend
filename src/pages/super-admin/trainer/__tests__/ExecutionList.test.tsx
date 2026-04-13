import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ExecutionList from "../ExecutionList";

/* ── Mocks ─────────────────────────────────────────────────────── */

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="sa-layout">{children}</div>,
}));

const mockExecutions = [
  {
    id: "exec-1234567890abcdef",
    status: "completed",
    step_count: 5,
    total_tokens: 12500,
    total_cost_usd: 0.0425,
    total_latency_ms: 3200,
    created_at: "2026-04-08T14:00:00Z",
  },
  {
    id: "exec-abcdef1234567890",
    status: "failed",
    step_count: 3,
    total_tokens: 8200,
    total_cost_usd: 0.029,
    total_latency_ms: 45000,
    created_at: "2026-04-07T10:00:00Z",
  },
];

const mockStats = {
  total_executions: 47,
  success_rate: 0.872,
  avg_cost_usd: 0.035,
  avg_duration_ms: 4200,
  most_failed_agents: [
    { agent_id: "error-agent", failure_count: 5 },
  ],
};

jest.mock("@/hooks/trainer/useTrainer", () => ({
  useExecutions: () => ({ data: { data: mockExecutions }, isLoading: false }),
  useExecutionStats: () => ({ data: { data: mockStats } }),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { email: "admin@test.com", role: "super-admin" },
    isAuthenticated: true,
  }),
}));

/* ── Helpers ───────────────────────────────────────────────────── */

function renderComponent() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ExecutionList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("ExecutionList", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the Workflow Executions heading", () => {
    renderComponent();
    expect(screen.getByText("Workflow Executions")).toBeInTheDocument();
  });

  it("shows total executions stat", () => {
    renderComponent();
    expect(screen.getByText("47")).toBeInTheDocument();
  });

  it("shows success rate stat", () => {
    renderComponent();
    expect(screen.getByText("87.2%")).toBeInTheDocument();
  });

  it("shows avg cost stat", () => {
    renderComponent();
    expect(screen.getByText("$0.0350")).toBeInTheDocument();
  });

  it("shows avg duration stat", () => {
    renderComponent();
    expect(screen.getByText("4.2s")).toBeInTheDocument();
  });

  it("renders execution rows in the table", () => {
    renderComponent();
    expect(screen.getByText("exec-123...")).toBeInTheDocument();
    expect(screen.getByText("exec-abc...")).toBeInTheDocument();
  });

  it("shows execution status badges", () => {
    renderComponent();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("failed")).toBeInTheDocument();
  });

  it("shows step counts", () => {
    renderComponent();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("navigates to execution detail when clicking a row", () => {
    renderComponent();
    fireEvent.click(screen.getByText("exec-123..."));
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/executions/exec-1234567890abcdef");
  });

  it("shows Most Failed Agents section", () => {
    renderComponent();
    expect(screen.getByText("Most Failed Agents")).toBeInTheDocument();
    expect(screen.getByText("error-agent")).toBeInTheDocument();
    expect(screen.getByText("5 failures")).toBeInTheDocument();
  });

  it("navigates back to workflows on back button click", () => {
    renderComponent();
    // The back button is the first ghost icon button
    const backBtn = screen.getAllByRole("button")[0];
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/workflows");
  });

  it("shows table headers", () => {
    renderComponent();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Steps")).toBeInTheDocument();
    expect(screen.getByText("Tokens")).toBeInTheDocument();
    expect(screen.getByText("Cost")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
  });
});
