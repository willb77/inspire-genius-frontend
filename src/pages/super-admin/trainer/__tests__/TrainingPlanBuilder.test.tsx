import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TrainingPlanBuilder from "../TrainingPlanBuilder";

/* ── Mocks ─────────────────────────────────────────────────────── */

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="sa-layout">{children}</div>,
}));

const mockCreatePlan = { mutate: jest.fn(), isPending: false };
const mockAddGoal = { mutate: jest.fn(), isPending: false };
const mockEvaluateGoal = { mutate: jest.fn(), isPending: false };
const mockActivatePlan = { mutate: jest.fn(), isPending: false };

const mockPlans = [
  { id: "plan-1", name: "Accuracy Boost", status: "draft" },
  { id: "plan-2", name: "Knowledge Expansion", status: "active" },
];

const mockPlanDetail = {
  plan: { name: "Accuracy Boost", target_accuracy: 0.85, status: "draft" },
  goals: [
    { id: "g1", title: "Hit 90% accuracy", goal_type: "accuracy", target_value: 0.9, current_value: 0.72, status: "in_progress" },
    { id: "g2", title: "Guardrail compliance", goal_type: "guardrail_compliance", target_value: 0.95, current_value: 0.95, status: "achieved" },
  ],
};

const mockProgress = {
  overall_progress: 0.65,
  days_elapsed: 12,
  days_remaining: 8,
  cost_to_date: 42.5,
};

jest.mock("@/hooks/trainer/useTrainer", () => ({
  useTrainingPlans: () => ({ data: { data: mockPlans } }),
  useCreateTrainingPlan: () => mockCreatePlan,
  useTrainingPlan: (_agentId: string, planId: string) => ({
    data: planId === "plan-1" ? { data: mockPlanDetail } : { data: null },
  }),
  useTrainingProgress: (_agentId: string, planId: string) => ({
    data: planId === "plan-1" ? { data: mockProgress } : { data: null },
  }),
  useAddTrainingGoal: () => mockAddGoal,
  useEvaluateGoal: () => mockEvaluateGoal,
  useActivateTrainingPlan: () => mockActivatePlan,
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { email: "admin@test.com", role: "super-admin" },
    isAuthenticated: true,
  }),
}));

/* ── Helpers ───────────────────────────────────────────────────── */

function renderComponent(agentId = "agent-1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/super-admin/agent-trainer/${agentId}/training`]}>
        <Routes>
          <Route path="/super-admin/agent-trainer/:agentId/training" element={<TrainingPlanBuilder />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("TrainingPlanBuilder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Training Plans heading", () => {
    renderComponent();
    expect(screen.getByText("Training Plans")).toBeInTheDocument();
  });

  it("lists training plans in the left panel", () => {
    renderComponent();
    expect(screen.getByText("Accuracy Boost")).toBeInTheDocument();
    expect(screen.getByText("Knowledge Expansion")).toBeInTheDocument();
  });

  it("shows plan status badges", () => {
    renderComponent();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("shows empty state before selecting a plan", () => {
    renderComponent();
    expect(screen.getByText(/Select a plan or create a new one/)).toBeInTheDocument();
  });

  it("shows plan detail when a plan is selected", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Accuracy Boost"));
    expect(screen.getByText(/Target accuracy: 85%/)).toBeInTheDocument();
    expect(screen.getByText("Hit 90% accuracy")).toBeInTheDocument();
    expect(screen.getByText("Guardrail compliance")).toBeInTheDocument();
  });

  it("shows overall progress bar when plan is selected", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Accuracy Boost"));
    expect(screen.getByText("65%")).toBeInTheDocument(); // overall_progress
    expect(screen.getByText(/Days elapsed: 12/)).toBeInTheDocument();
    expect(screen.getByText(/Days remaining: 8/)).toBeInTheDocument();
    expect(screen.getByText(/\$42\.50/)).toBeInTheDocument();
  });

  it("shows Activate button for draft plans", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Accuracy Boost"));
    expect(screen.getByText("Activate")).toBeInTheDocument();
  });

  it("calls activatePlan when Activate is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Accuracy Boost"));
    fireEvent.click(screen.getByText("Activate"));
    expect(mockActivatePlan.mutate).toHaveBeenCalledWith({
      agentId: "agent-1",
      planId: "plan-1",
    });
  });

  it("shows Evaluate button on each goal", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Accuracy Boost"));
    const evalBtns = screen.getAllByText("Evaluate");
    expect(evalBtns.length).toBe(2);
  });

  it("calls evaluateGoal when Evaluate is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Accuracy Boost"));
    const evalBtns = screen.getAllByText("Evaluate");
    fireEvent.click(evalBtns[0]);
    expect(mockEvaluateGoal.mutate).toHaveBeenCalledWith({
      agentId: "agent-1",
      planId: "plan-1",
      goalId: "g1",
    });
  });

  it("shows Add Goal button and dialog trigger", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Accuracy Boost"));
    expect(screen.getByText("Add Goal")).toBeInTheDocument();
  });

  it("shows new plan input and create button", () => {
    renderComponent();
    expect(screen.getByPlaceholderText("New plan...")).toBeInTheDocument();
  });
});
