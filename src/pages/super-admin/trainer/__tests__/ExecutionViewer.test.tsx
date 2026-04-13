import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ExecutionViewer from "../ExecutionViewer";

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

const mockExecution = {
  id: "exec-abc123",
  status: "completed",
  step_count: 3,
  total_tokens: 9500,
  total_cost_usd: 0.032,
  total_latency_ms: 2800,
  trigger_input: "Onboard a new user with PRISM profile",
  final_output: "User onboarded successfully with PRISM assessment complete.",
  started_at: "2026-04-09T10:00:00Z",
  completed_at: "2026-04-09T10:00:03Z",
  created_at: "2026-04-09T10:00:00Z",
};

const mockSteps = [
  {
    id: "step-1",
    execution_id: "exec-abc123",
    step_index: 0,
    agent_id: "onboarding-agent",
    agent_name: "Onboarding Agent",
    task_description: "Collect user information",
    tokens_input: 2000,
    tokens_output: 1500,
    cost_usd: 0.012,
    latency_ms: 900,
    status: "completed",
    wave_number: 1,
    started_at: "2026-04-09T10:00:00Z",
    completed_at: "2026-04-09T10:00:01Z",
    output_text: "User info collected successfully.",
    input_context: { user_id: "u-123" },
    error_message: null,
  },
  {
    id: "step-2",
    execution_id: "exec-abc123",
    step_index: 1,
    agent_id: "prism-agent",
    agent_name: "PRISM Agent",
    task_description: "Run PRISM assessment",
    tokens_input: 3000,
    tokens_output: 2000,
    cost_usd: 0.015,
    latency_ms: 1200,
    status: "failed",
    wave_number: 2,
    started_at: "2026-04-09T10:00:01Z",
    completed_at: "2026-04-09T10:00:02Z",
    output_text: null,
    input_context: null,
    error_message: "PRISM API timeout after 30s",
  },
  {
    id: "step-3",
    execution_id: "exec-abc123",
    step_index: 2,
    agent_id: "notification-agent",
    agent_name: "Notification Agent",
    task_description: "Send welcome email",
    tokens_input: 500,
    tokens_output: 500,
    cost_usd: 0.005,
    latency_ms: 700,
    status: "paused",
    wave_number: 3,
    started_at: "2026-04-09T10:00:02Z",
    completed_at: null,
    output_text: null,
    input_context: null,
    error_message: null,
  },
];

const mockApproveStep = { mutate: jest.fn(), isPending: false };
const mockRejectStep = { mutate: jest.fn(), isPending: false };

jest.mock("@/hooks/trainer/useTrainer", () => ({
  useExecution: () => ({ data: { data: mockExecution } }),
  useExecutionSteps: () => ({ data: { data: mockSteps } }),
  useApproveStep: () => mockApproveStep,
  useRejectStep: () => mockRejectStep,
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { email: "admin@test.com", role: "super-admin" },
    isAuthenticated: true,
  }),
}));

/* ── Helpers ───────────────────────────────────────────────────── */

function renderComponent(executionId = "exec-abc123") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/super-admin/agent-trainer/executions/${executionId}`]}>
        <Routes>
          <Route path="/super-admin/agent-trainer/executions/:executionId" element={<ExecutionViewer />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("ExecutionViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Execution Trace heading", () => {
    renderComponent();
    expect(screen.getByText("Execution Trace")).toBeInTheDocument();
  });

  it("shows the execution ID", () => {
    renderComponent();
    expect(screen.getByText("exec-abc123")).toBeInTheDocument();
  });

  it("shows execution status badge", () => {
    renderComponent();
    // The execution status "completed" appears in the header badge
    const badges = screen.getAllByText("completed");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows execution summary cards", () => {
    renderComponent();
    expect(screen.getByText("3")).toBeInTheDocument(); // step_count
    expect(screen.getByText("9,500")).toBeInTheDocument(); // total_tokens
    expect(screen.getByText("$0.0320")).toBeInTheDocument(); // total_cost
    expect(screen.getByText("2.8s")).toBeInTheDocument(); // duration
  });

  it("shows trigger input", () => {
    renderComponent();
    expect(screen.getByText("Onboard a new user with PRISM profile")).toBeInTheDocument();
  });

  it("shows final output", () => {
    renderComponent();
    expect(screen.getByText("User onboarded successfully with PRISM assessment complete.")).toBeInTheDocument();
  });

  it("lists all steps in the step panel", () => {
    renderComponent();
    // Agent names appear in both step list and detail panel for the selected step
    expect(screen.getAllByText("Onboarding Agent").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("PRISM Agent").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Notification Agent").length).toBeGreaterThanOrEqual(1);
  });

  it("shows step count heading", () => {
    renderComponent();
    expect(screen.getByText("Steps (3)")).toBeInTheDocument();
  });

  it("auto-selects first step and shows its detail panel", () => {
    renderComponent();
    // "Collect user information" appears in both step list and detail panel
    const matches = screen.getAllByText("Collect user information");
    expect(matches.length).toBeGreaterThanOrEqual(2); // step list + detail
  });

  it("shows step metrics for selected step", () => {
    renderComponent();
    // First step: 2000 in + 1500 out = 3500 tokens
    expect(screen.getByText("3,500")).toBeInTheDocument();
    expect(screen.getByText("2000 in / 1500 out")).toBeInTheDocument();
  });

  it("shows error message for failed steps", () => {
    renderComponent();
    // Select the failed step
    fireEvent.click(screen.getByText("PRISM Agent"));
    expect(screen.getByText("PRISM API timeout after 30s")).toBeInTheDocument();
  });

  it("shows HITL review controls for paused steps", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Notification Agent"));
    expect(screen.getByText("Human-in-the-Loop Review Required")).toBeInTheDocument();
    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("Reject")).toBeInTheDocument();
  });

  it("calls approveStep when Approve is clicked on paused step", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Notification Agent"));
    fireEvent.click(screen.getByText("Approve"));
    expect(mockApproveStep.mutate).toHaveBeenCalledWith({
      executionId: "exec-abc123",
      stepId: "step-3",
      approvedBy: "admin@test.com",
    });
  });

  it("navigates back to executions list on back button click", () => {
    renderComponent();
    const backBtn = screen.getAllByRole("button")[0];
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/executions");
  });

  it("shows input context toggle for steps with context", () => {
    renderComponent();
    // First step is auto-selected and has input_context
    expect(screen.getByText("Input Context")).toBeInTheDocument();
  });

  it("expands input context when clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Input Context"));
    expect(screen.getByText(/"user_id"/)).toBeInTheDocument();
  });
});
