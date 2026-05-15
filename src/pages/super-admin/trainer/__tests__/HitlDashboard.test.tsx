import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HitlDashboard from "../HitlDashboard";

/* ── Mocks ─────────────────────────────────────────────────────── */

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="sa-layout">{children}</div>,
}));

const mockApprove = { mutate: jest.fn(), isPending: false };
const mockReject = { mutate: jest.fn(), isPending: false };

const mockApprovals = [
  {
    id: "app-1",
    execution_id: "exec-abc",
    step_id: "step-12345678-rest",
    approver_role: "super-admin",
    context_summary: "Agent wants to send email to user.",
    status: "pending",
    approved_by: null,
    rejection_reason: null,
    timeout_hours: 24,
    expires_at: null,
    created_at: "2026-04-09T10:00:00Z",
    resolved_at: null,
    time_remaining_seconds: 7200,
  },
  {
    id: "app-2",
    execution_id: "exec-def",
    step_id: null,
    approver_role: "company-admin",
    context_summary: "Short context",
    status: "approved",
    approved_by: "admin@test.com",
    rejection_reason: null,
    timeout_hours: 12,
    expires_at: null,
    created_at: "2026-04-08T08:00:00Z",
    resolved_at: "2026-04-08T09:00:00Z",
    time_remaining_seconds: null,
  },
];

jest.mock("@/hooks/trainer/useTrainer", () => ({
  usePendingApprovals: () => ({
    data: { data: mockApprovals, count: 2 },
    isLoading: false,
    error: null,
  }),
  useApproveApproval: () => mockApprove,
  useRejectApproval: () => mockReject,
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { email: "admin@test.com", name: "Admin", role: "super-admin" },
    isAuthenticated: true,
  }),
}));

/* ── Helpers ───────────────────────────────────────────────────── */

function renderComponent() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HitlDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("HitlDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the HITL Approvals heading", () => {
    renderComponent();
    expect(screen.getByText("HITL Approvals")).toBeInTheDocument();
  });

  it("shows pending count badge", () => {
    renderComponent();
    expect(screen.getByText("2 pending")).toBeInTheDocument();
  });

  it("renders approval cards", () => {
    renderComponent();
    expect(screen.getByText("Agent wants to send email to user.")).toBeInTheDocument();
    expect(screen.getByText("Short context")).toBeInTheDocument();
  });

  it("shows status badges", () => {
    renderComponent();
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
  });

  it("shows approver role", () => {
    renderComponent();
    expect(screen.getByText("super-admin")).toBeInTheDocument();
    expect(screen.getByText("company-admin")).toBeInTheDocument();
  });

  it("shows time remaining for pending items", () => {
    renderComponent();
    expect(screen.getByText("2h 0m remaining")).toBeInTheDocument();
  });

  it("shows Expired for null time_remaining_seconds", () => {
    renderComponent();
    expect(screen.getByText("Expired")).toBeInTheDocument();
  });

  it("shows Approve and Reject buttons for pending approvals", () => {
    renderComponent();
    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("Reject")).toBeInTheDocument();
  });

  it("does not show action buttons for already-approved items", () => {
    renderComponent();
    // Only one set of Approve/Reject buttons (for the pending item)
    expect(screen.getAllByText("Approve").length).toBe(1);
    expect(screen.getAllByText("Reject").length).toBe(1);
  });

  it("calls approveApproval when Approve is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Approve"));
    expect(mockApprove.mutate).toHaveBeenCalledWith({
      approvalId: "app-1",
      approvedBy: "admin@test.com",
    });
  });

  it("opens reject dialog when Reject is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Reject"));
    expect(screen.getByText("Reject Approval")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter rejection reason...")).toBeInTheDocument();
  });

  it("shows Workflow Execution label for items with execution_id", () => {
    renderComponent();
    expect(screen.getAllByText("Workflow Execution").length).toBeGreaterThanOrEqual(1);
  });
});
