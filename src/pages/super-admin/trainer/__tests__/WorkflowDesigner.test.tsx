import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WorkflowDesigner from "../WorkflowDesigner";

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
    agent_id: "coach-agent",
    ecosystem_id: "inspire-genius",
    name: "Coach Agent",
    domain: "coaching",
    maturity_level: 3,
    status: "active",
    role_subtitle: "Coaching helper",
  },
];

jest.mock("@/hooks/trainer/useTrainer", () => ({
  useTrainerAgents: () => ({ data: { data: mockAgents } }),
  useEcosystems: () => ({
    data: { data: [{ ecosystem_id: "inspire-genius", ecosystem_name: "Inspire Genius" }] },
  }),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { email: "admin@test.com", role: "super-admin" },
    isAuthenticated: true,
  }),
}));

// Mock the DagBuilder component from the internal package
let capturedProps: any = {};
jest.mock("@inspiresgenius/dag-builder", () => ({
  DagBuilder: (props: any) => {
    capturedProps = props;
    return <div data-testid="dag-builder">DagBuilder Mock</div>;
  },
  createIGConfig: (baseUrl: string) => ({
    adapter: {
      agents: [],
      domainGroups: {},
      baseUrl,
    },
  }),
}));

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  api: { post: jest.fn().mockResolvedValue({ data: {} }) },
  default: { post: jest.fn().mockResolvedValue({ data: {} }) },
}));

/* ── Helpers ───────────────────────────────────────────────────── */

function renderComponent() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WorkflowDesigner />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("WorkflowDesigner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedProps = {};
  });

  it("renders the DagBuilder component", () => {
    renderComponent();
    expect(screen.getByTestId("dag-builder")).toBeInTheDocument();
  });

  it("passes ecosystemConfig to DagBuilder", () => {
    renderComponent();
    expect(capturedProps.ecosystemConfig).toBeDefined();
    expect(capturedProps.ecosystemConfig.adapter).toBeDefined();
  });

  it("maps VAT agents to DPB agents in ecosystem config", () => {
    renderComponent();
    const config = capturedProps.ecosystemConfig;
    // Our mock agent should be mapped
    expect(config.adapter.agents.length).toBe(1);
    expect(config.adapter.agents[0].id).toBe("coach-agent");
    expect(config.adapter.agents[0].displayName).toBe("Coach Agent");
    expect(config.adapter.agents[0].domain).toBe("coaching");
  });

  it("builds domain groups from VAT agent data", () => {
    renderComponent();
    const config = capturedProps.ecosystemConfig;
    expect(config.adapter.domainGroups).toEqual({ coaching: ["coach-agent"] });
  });

  it("passes onSave callback to DagBuilder", () => {
    renderComponent();
    expect(typeof capturedProps.onSave).toBe("function");
  });

  it("passes onTrainAgent callback to DagBuilder", () => {
    renderComponent();
    expect(typeof capturedProps.onTrainAgent).toBe("function");
  });

  it("onTrainAgent navigates to agent prompt page", () => {
    renderComponent();
    capturedProps.onTrainAgent("some-agent-id");
    expect(mockNavigate).toHaveBeenCalledWith("/super-admin/agent-trainer/some-agent-id/prompt");
  });

  it("passes onRegisterAgent callback to DagBuilder", () => {
    renderComponent();
    expect(typeof capturedProps.onRegisterAgent).toBe("function");
  });

  it("renders inside SuperAdminLayout", () => {
    renderComponent();
    expect(screen.getByTestId("sa-layout")).toBeInTheDocument();
  });
});
