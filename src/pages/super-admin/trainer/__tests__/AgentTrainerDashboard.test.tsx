import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AgentTrainerDashboard from "../AgentTrainerDashboard";

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

const mockAgents = [
  {
    id: "a1",
    agent_id: "agent-1",
    ecosystem_id: "inspire-genius",
    name: "Coach Agent",
    domain: "coaching",
    maturity_level: 3,
    status: "active",
    role_subtitle: "Coaching helper",
  },
  {
    id: "a2",
    agent_id: "agent-2",
    ecosystem_id: "inspire-genius",
    name: "Business Agent",
    domain: "business",
    maturity_level: 1,
    status: "training",
    role_subtitle: null,
  },
  {
    id: "a3",
    agent_id: "agent-3",
    ecosystem_id: "inspire-genius",
    name: "System Agent",
    domain: "system",
    maturity_level: 5,
    status: "active",
    role_subtitle: "System helper",
  },
];

const mockEcosystems = [
  { ecosystem_id: "inspire-genius", ecosystem_name: "Inspire Genius" },
];

// Swappable so a test can supply the shape the API actually returns. The
// shared fixture above carries BOTH `id` and `agent_id`, which is precisely
// why the live "navigates to /undefined/" bug was invisible to this suite.
let trainerPayload: unknown[] = mockAgents;

jest.mock("@/hooks/trainer/useTrainer", () => ({
  useTrainerAgents: () => ({ data: { data: trainerPayload }, isLoading: false }),
  useEcosystems: () => ({ data: { data: mockEcosystems } }),
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
        <AgentTrainerDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("AgentTrainerDashboard", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders the page title", () => {
    renderComponent();
    expect(screen.getByText("Agent Trainer")).toBeInTheDocument();
  });

  it("renders agent cards for all agents", () => {
    renderComponent();
    expect(screen.getByText("Coach Agent")).toBeInTheDocument();
    expect(screen.getByText("Business Agent")).toBeInTheDocument();
    expect(screen.getByText("System Agent")).toBeInTheDocument();
  });

  it("shows domain badges on agent cards", () => {
    renderComponent();
    // Each domain text appears twice: once in the filter button and once in the card badge
    expect(screen.getAllByText("coaching").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("business").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("system").length).toBeGreaterThanOrEqual(2);
  });

  it("filters agents by domain when clicking a domain button", () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "coaching" }));
    expect(screen.getByText("Coach Agent")).toBeInTheDocument();
    expect(screen.queryByText("Business Agent")).not.toBeInTheDocument();
    expect(screen.queryByText("System Agent")).not.toBeInTheDocument();
  });

  it("filters agents by search text", () => {
    renderComponent();
    const searchInput = screen.getByPlaceholderText("Search agents...");
    fireEvent.change(searchInput, { target: { value: "coach" } });
    expect(screen.getByText("Coach Agent")).toBeInTheDocument();
    expect(screen.queryByText("Business Agent")).not.toBeInTheDocument();
  });

  it("navigates to agent detail when clicking a card", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Coach Agent"));
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/agent-1");
  });

  // Regression: GET /v1/trainer/agents returns rows keyed `id`, while
  // AgentConfig and every link on this page read `agent_id`. The payload used
  // to be passed through raw, so on the live site every tile action navigated
  // to /super-admin/agent-trainer/undefined/... . The existing fixtures carry
  // BOTH keys, which is why the old tests could not catch it — this one uses a
  // trainer-shaped row that carries only `id`.
  it("does not route to 'undefined' when the API returns rows keyed `id` only", () => {
    // Exactly what GET /v1/trainer/agents returns (trainer-service
    // routes/agents.py builds each row with "id", never "agent_id").
    trainerPayload = [
      {
        id: "a1",
        ecosystem_id: "inspire-genius",
        name: "Coach Agent",
        domain: "coaching",
        maturity_level: 3,
        status: "active",
        role_subtitle: "Coaching helper",
      },
    ];
    try {
      renderComponent();
      for (const label of ["Prompt", "Knowledge", "Test", "Training", "Costs"]) {
        fireEvent.click(screen.getAllByText(label)[0]);
      }
      expect(mockNavigate).toHaveBeenCalled();
      for (const call of mockNavigate.mock.calls) {
        expect(String(call[0])).not.toContain("undefined");
      }
      // and it resolves to the row's real id
      expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/a1/prompt");
    } finally {
      trainerPayload = mockAgents;
    }
  });

  it("exposes every per-agent option, including Training and Costs", () => {
    renderComponent();
    // Training Plans and Costs have routes but had no entry point on the tile,
    // even though the help panel tells the operator to use Training Plans.
    expect(screen.getAllByText("Training").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Costs").length).toBeGreaterThanOrEqual(1);
  });

  it("links the trainer tools that previously had no entry point anywhere", () => {
    renderComponent();
    fireEvent.click(screen.getByText("Workflow Designer"));
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/workflows");
    fireEvent.click(screen.getByText("Executions"));
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/executions");
    fireEvent.click(screen.getByText("Approvals"));
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/approvals");
  });

  it("navigates to prompt page via Prompt button", () => {
    renderComponent();
    const promptBtns = screen.getAllByText("Prompt");
    fireEvent.click(promptBtns[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/agent-1/prompt");
  });

  it("navigates to knowledge page via Knowledge button", () => {
    renderComponent();
    const knowledgeBtns = screen.getAllByText("Knowledge");
    fireEvent.click(knowledgeBtns[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/agent-1/knowledge");
  });

  it("navigates to test page via Test button", () => {
    renderComponent();
    const testBtns = screen.getAllByText("Test");
    fireEvent.click(testBtns[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/agent-1/test");
  });

  it("shows maturity level names", () => {
    renderComponent();
    expect(screen.getByText("Growing")).toBeInTheDocument(); // level 3
    expect(screen.getByText("Seed")).toBeInTheDocument(); // level 1
    expect(screen.getByText("Expert")).toBeInTheDocument(); // level 5
  });

  it("returns to showing all agents when 'all' filter is clicked", () => {
    renderComponent();
    fireEvent.click(screen.getByRole("button", { name: "coaching" }));
    expect(screen.queryByText("Business Agent")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "all" }));
    expect(screen.getByText("Business Agent")).toBeInTheDocument();
  });
});
