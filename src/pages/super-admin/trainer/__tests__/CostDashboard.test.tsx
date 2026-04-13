import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CostDashboard from "../CostDashboard";

/* ── Mocks ─────────────────────────────────────────────────────── */

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="sa-layout">{children}</div>,
}));

jest.mock("@/hooks/trainer/useTrainer", () => ({
  useAgentCosts: () => ({
    data: {
      data: {
        total_usd: 127.45,
        cost_per_interaction: 0.0032,
        period: "30d",
        by_category: { inference: 98.2, embedding: 29.25 },
      },
    },
  }),
  useAgentROI: () => ({
    data: {
      data: {
        roi_percent: 245,
        total_cost: 127.45,
        total_value: 439.72,
        break_even_days: 14,
        value_breakdown: { time_saved: 300, satisfaction_improvement: 139.72 },
      },
    },
  }),
  useBudgetStatus: () => ({
    data: { data: { utilization_pct: 63 } },
  }),
  useAuditLog: () => ({
    data: {
      data: [
        {
          id: "aud-1",
          action: "prompt.published",
          target_type: "prompt",
          target_id: "prompt-abc",
          actor_email: "admin@test.com",
          created_at: "2026-04-01T12:00:00Z",
        },
      ],
    },
  }),
  useAuditStats: () => ({
    data: { data: { total_entries: 42 } },
  }),
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
      <MemoryRouter initialEntries={[`/super-admin/agent-trainer/${agentId}/costs`]}>
        <Routes>
          <Route path="/super-admin/agent-trainer/:agentId/costs" element={<CostDashboard />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("CostDashboard", () => {
  it("renders the page title", () => {
    renderComponent();
    expect(screen.getByText("Cost & ROI Dashboard")).toBeInTheDocument();
  });

  it("shows total spend KPI", () => {
    renderComponent();
    expect(screen.getByText("$127.45")).toBeInTheDocument();
  });

  it("shows cost per interaction", () => {
    renderComponent();
    expect(screen.getByText("$0.0032")).toBeInTheDocument();
  });

  it("shows budget utilization", () => {
    renderComponent();
    expect(screen.getByText("63%")).toBeInTheDocument();
  });

  it("shows audit events count", () => {
    renderComponent();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("shows cost by category breakdown", () => {
    renderComponent();
    expect(screen.getByText("inference")).toBeInTheDocument();
    expect(screen.getByText("embedding")).toBeInTheDocument();
  });

  it("renders Costs, ROI, and Audit Trail tabs", () => {
    renderComponent();
    expect(screen.getByRole("tab", { name: "Costs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "ROI" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Audit Trail" })).toBeInTheDocument();
  });

  it("shows period label", () => {
    renderComponent();
    expect(screen.getByText("30d period")).toBeInTheDocument();
  });
});
