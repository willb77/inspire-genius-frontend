/**
 * House style, goals area (S2a) — four display fixes behind isHouseStyleOn("goals").
 *
 * Every fix is pinned twice: switch OFF renders exactly today's words and links,
 * switch ON renders the fix. The switch is display-only, so no test here expects
 * a different server call.
 */
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MyGoalsResponse, SummitGoal, SummitSession } from "@/types/summit";
import { ROUTES } from "@/constants/routes";

const mockGetGoalSession = jest.fn();
const mockGetMyGoals = jest.fn();
jest.mock("@/services/summit/goals.service", () => ({
  getGoalSession: () => mockGetGoalSession(),
  getMyGoals: () => mockGetMyGoals(),
  patchGoal: jest.fn(),
  deleteGoal: jest.fn(),
  createGoal: jest.fn(),
  publishGoal: jest.fn(),
  unpublishGoal: jest.fn(),
  setGoalVisibility: jest.fn(),
}));

const svc = {
  getPeople: jest.fn(),
  getMyGrants: jest.fn(),
  getAccessLog: jest.fn(),
  getCategories: jest.fn(),
};
jest.mock("@/services/consent/visibility.service", () => ({
  getPeople: () => svc.getPeople(),
  getMyGrants: () => svc.getMyGrants(),
  getAccessLog: () => svc.getAccessLog(),
  getCategories: () => svc.getCategories(),
  lookupPerson: jest.fn(),
  offerAccess: jest.fn(),
  extendGrant: jest.fn(),
  revokeGrant: jest.fn(),
  respondToRequest: jest.fn(),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Test Person", email: "test@example.com" } }),
}));

// The wiring card has its own tests and its own server switch; keep it out.
jest.mock("@/pages/summit/components/GoalsWiringCard", () => ({
  GoalsWiringCard: () => null,
}));

// The coach's card, reduced to the one control the preview must not offer.
jest.mock("@/components/manager/development/tabs/GoalsPanel", () => ({
  CoachGoalCard: ({ goal }: { goal: { title: string } }) => (
    <div data-testid="coach-goal-card">
      {goal.title}
      <button type="button">Co-ratify</button>
    </div>
  ),
}));

import SummitDashboard from "@/pages/summit/SummitDashboard";
import SummitDiscovery from "@/pages/summit/SummitDiscovery";
import SummitGoals from "@/pages/summit/SummitGoals";
import SummitSharing from "@/pages/summit/SummitSharing";

const CATS: SummitSession["categories"] = {
  history: { label: "Career History", status: "explored", answers: [], summary: "" },
  job: { label: "Current Job Situation", status: "active", answers: [], summary: "" },
  workplace: { label: "Workplace Situation", status: "todo", answers: [], summary: "" },
  ambitions: { label: "Career Ambitions", status: "todo", answers: [], summary: "" },
  personal: { label: "Personal Goals", status: "todo", answers: [], summary: "" },
};

function goal(over: Partial<SummitGoal> = {}): SummitGoal {
  return {
    goal_id: "g1",
    title: "Automate the weekly report",
    category: "job",
    motivation: "Time back",
    prism_alignment: { relationship: "leverages_strength", dimensions: ["Structure"] },
    status: "proposed",
    ...over,
  } as SummitGoal;
}

const session = (goals: SummitGoal[]): SummitSession => ({ version: 1, categories: CATS, goals });
const NOTHING_PUBLISHED: MyGoalsResponse = { memberId: "m1", goals: [], coverage: [] };

function renderAt(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function switchOn() {
  localStorage.setItem("house_style_goals", "true");
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  mockGetGoalSession.mockResolvedValue(session([]));
  mockGetMyGoals.mockResolvedValue(NOTHING_PUBLISHED);
  svc.getPeople.mockResolvedValue({
    people: [],
    sources: { managers_of_record: "ok", roster_managers: "ok", practitioners: "ok", requesters: "ok" },
  });
  svc.getMyGrants.mockResolvedValue([]);
  svc.getAccessLog.mockResolvedValue([]);
  svc.getCategories.mockResolvedValue({ categories: [], details: [], notGrantable: [] });
});

afterAll(() => localStorage.clear());

describe("Overview — the stale 'on the right' text", () => {
  it("OFF: today's sentence, pointing at a panel that no longer exists", async () => {
    renderAt(<SummitDashboard />);
    expect(await screen.findByText(/on the right\s+of this screen/i)).toBeInTheDocument();
  });

  it("ON: no 'on the right'; a link to the conversation instead", async () => {
    switchOn();
    renderAt(<SummitDashboard />);
    expect(await screen.findByText(/as you talk it through/i)).toBeInTheDocument();
    expect(screen.queryByText(/on the right/i)).toBeNull();
  });
});

describe("Overview → Discovery dead end", () => {
  it("OFF: Resume and Continue discovery both go to the read-only Discovery page", async () => {
    mockGetGoalSession.mockResolvedValue(session([goal()]));
    renderAt(<SummitDashboard />);
    const resume = await screen.findByRole("link", { name: /resume/i });
    expect(resume).toHaveAttribute("href", ROUTES.MY_GOALS.DISCOVERY);
    expect(screen.getByRole("link", { name: /continue discovery/i })).toHaveAttribute(
      "href",
      ROUTES.MY_GOALS.DISCOVERY,
    );
    expect(screen.queryByRole("link", { name: /talk it through/i })).toBeNull();
  });

  it("ON: both go to the conversation, which can actually be started", async () => {
    switchOn();
    mockGetGoalSession.mockResolvedValue(session([goal()]));
    renderAt(<SummitDashboard />);
    const resume = await screen.findByRole("link", { name: /resume/i });
    expect(resume).toHaveAttribute("href", ROUTES.MY_GOALS.INTERVIEW);
    expect(screen.getByRole("link", { name: /talk it through/i })).toHaveAttribute(
      "href",
      ROUTES.MY_GOALS.INTERVIEW,
    );
    expect(screen.queryByRole("link", { name: /continue discovery/i })).toBeNull();
    expect(screen.queryAllByRole("link").filter((a) => a.getAttribute("href") === ROUTES.MY_GOALS.DISCOVERY)).toHaveLength(0);
  });

  it("OFF: Discovery offers no way into the conversation, as today", async () => {
    renderAt(<SummitDiscovery />);
    expect(await screen.findByText(/Current Job Situation/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /talk it through/i })).toBeNull();
  });

  it("ON: Discovery links to the conversation", async () => {
    switchOn();
    renderAt(<SummitDiscovery />);
    expect(await screen.findByRole("link", { name: /talk it through/i })).toHaveAttribute(
      "href",
      ROUTES.MY_GOALS.INTERVIEW,
    );
  });
});

describe("Callouts shown with no data", () => {
  const BRAIN = /Every goal here is aligned to your brain map/i;
  const STRETCH = /isn.t a weakness call/i;

  it("OFF: the brain-map callout shows with zero goals", async () => {
    renderAt(<SummitDashboard />);
    expect(await screen.findByText(/No goals yet/i)).toBeInTheDocument();
    expect(screen.getByText(BRAIN)).toBeInTheDocument();
  });

  it("ON: the brain-map callout is gone with zero goals", async () => {
    switchOn();
    renderAt(<SummitDashboard />);
    expect(await screen.findByText(/No goals yet/i)).toBeInTheDocument();
    expect(screen.queryByText(BRAIN)).toBeNull();
  });

  it("ON: the brain-map callout is gone when a goal carries no PRISM alignment", async () => {
    switchOn();
    mockGetGoalSession.mockResolvedValue(session([goal(), goal({ goal_id: "g2", prism_alignment: undefined })]));
    renderAt(<SummitDashboard />);
    expect(await screen.findByText(/Goals built on how you think/i)).toBeInTheDocument();
    expect(screen.queryByText(BRAIN)).toBeNull();
  });

  it("ON: the brain-map callout shows when every goal is aligned", async () => {
    switchOn();
    mockGetGoalSession.mockResolvedValue(session([goal()]));
    renderAt(<SummitDashboard />);
    expect(await screen.findByText(BRAIN)).toBeInTheDocument();
  });

  it("ON: the brain-map callout is gone when the session cannot be read", async () => {
    switchOn();
    mockGetGoalSession.mockRejectedValue(new Error("boom"));
    renderAt(<SummitDashboard />);
    expect(await screen.findByText(/couldn.t read your goal-setting session/i)).toBeInTheDocument();
    expect(screen.queryByText(BRAIN)).toBeNull();
  });

  it("OFF: 'Requires stretch' is explained with zero goals", async () => {
    renderAt(<SummitGoals />);
    expect(await screen.findByText(/No goals yet/i)).toBeInTheDocument();
    expect(screen.getByText(STRETCH)).toBeInTheDocument();
  });

  it("ON: no 'Requires stretch' explanation with zero goals", async () => {
    switchOn();
    renderAt(<SummitGoals />);
    expect(await screen.findByText(/No goals yet/i)).toBeInTheDocument();
    expect(screen.queryByText(STRETCH)).toBeNull();
  });

  it("ON: no explanation when the goals on the page are not stretch goals", async () => {
    switchOn();
    mockGetGoalSession.mockResolvedValue(session([goal()]));
    renderAt(<SummitGoals />);
    expect(await screen.findByText(/Drafts from your interview/i)).toBeInTheDocument();
    expect(screen.queryByText(STRETCH)).toBeNull();
  });

  it("ON: the explanation shows beside a goal marked Requires stretch", async () => {
    switchOn();
    mockGetGoalSession.mockResolvedValue(
      session([goal({ prism_alignment: { relationship: "requires_stretch" } })]),
    );
    renderAt(<SummitGoals />);
    expect(await screen.findByText(STRETCH)).toBeInTheDocument();
  });
});

describe("Sharing — the fake Co-ratify in 'What they see'", () => {
  const SHAREABLE: MyGoalsResponse = {
    memberId: "m1",
    coverage: [],
    goals: [
      {
        goalId: "b1", memberId: "m1", title: "Lead the reporting redesign", category: "current_job",
        horizon: "short", motivation: "", prismAlignment: { kind: "leverages" }, executionStyle: "",
        successMetric: "", firstStep: "", ownerCoach: "", status: "provisional", provenanceQuotes: [],
        source: "member", visibility: "shareable", publishedFrom: "s1", publishedAt: null,
      },
    ],
  };

  it("OFF: the preview's Co-ratify looks and behaves like a live button, as today", async () => {
    mockGetMyGoals.mockResolvedValue(SHAREABLE);
    renderAt(<SummitSharing />);
    const card = await screen.findByTestId("coach-goal-card");
    expect(within(card).getByRole("button", { name: /co-ratify/i })).toBeEnabled();
    expect(screen.queryByTestId("sharing-preview-note")).toBeNull();
  });

  it("ON: the preview has no live controls and says so", async () => {
    switchOn();
    mockGetMyGoals.mockResolvedValue(SHAREABLE);
    renderAt(<SummitSharing />);
    const card = await screen.findByTestId("coach-goal-card");
    expect(screen.getByTestId("sharing-preview")).toContainElement(card);
    expect(within(card).getByRole("button", { name: /co-ratify/i })).toBeDisabled();
    expect(screen.getByTestId("sharing-preview-note")).toHaveTextContent(/nothing on it can be clicked/i);
  });
});
