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

jest.mock("@/hooks/trainer/useTrainer", () => ({
  useTrainerAgents: () => ({ data: { data: mockAgents }, isLoading: false }),
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
