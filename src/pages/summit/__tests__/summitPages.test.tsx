import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MyGoalsResponse, SummitSession } from "@/types/summit";

// The surface reads two live endpoints: the session (GET /v1/agents/goals/session)
// and the shared record (GET /v1/agents/goals/mine). Mock the SERVICE rather
// than the hooks so the hooks' own derivation — category order, goal counts,
// which session goals are still drafts — is exercised rather than stubbed
// past. That derivation is where the bugs would be.
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

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Will Brown", email: "will@example.com" } }),
}));

import SummitDashboard from "@/pages/summit/SummitDashboard";
import SummitDiscovery from "@/pages/summit/SummitDiscovery";
import SummitGoals from "@/pages/summit/SummitGoals";
import SummitCoaches from "@/pages/summit/SummitCoaches";
import SummitComingSoon from "@/pages/summit/SummitComingSoon";

const SESSION: SummitSession = {
  version: 1,
  categories: {
    history: { label: "Career History", status: "explored", answers: [{ question: "q", answer: "a" }], summary: "" },
    job: { label: "Current Job Situation", status: "explored", answers: [], summary: "Mostly firefighting." },
    workplace: { label: "Workplace Situation", status: "active", answers: [], summary: "" },
    ambitions: { label: "Career Ambitions", status: "todo", answers: [], summary: "" },
    personal: { label: "Personal Goals", status: "todo", answers: [], summary: "" },
  },
  goals: [
    {
      goal_id: "g1",
      title: "Automate the top 3 manual reporting workflows",
      category: "job",
      motivation: "Reclaim energy drained by repetitive status work",
      prism_alignment: { relationship: "leverages_strength", dimensions: ["Structure"], quadrant: "Gold" },
      execution_style: "gold_stepwise",
      success_metric: "3 reports run without manual intervention",
      owning_coach: "job_mentor",
      status: "proposed",
    },
  ],
};

const EMPTY: SummitSession = {
  version: 1,
  categories: {
    history: { label: "Career History", status: "todo", answers: [], summary: "" },
    job: { label: "Current Job Situation", status: "todo", answers: [], summary: "" },
    workplace: { label: "Workplace Situation", status: "todo", answers: [], summary: "" },
    ambitions: { label: "Career Ambitions", status: "todo", answers: [], summary: "" },
    personal: { label: "Personal Goals", status: "todo", answers: [], summary: "" },
  },
  goals: [],
};

const NOTHING_PUBLISHED: MyGoalsResponse = { memberId: "m1", goals: [], coverage: [] };

const PUBLISHED: MyGoalsResponse = {
  memberId: "m1",
  coverage: [],
  goals: [
    {
      goalId: "b1",
      memberId: "m1",
      title: "Automate the top 3 manual reporting workflows",
      category: "current_job",
      horizon: "short",
      motivation: "Reclaim energy drained by repetitive status work",
      prismAlignment: { kind: "leverages" },
      executionStyle: "",
      successMetric: "3 reports run without manual intervention",
      firstStep: "",
      ownerCoach: "job_mentor",
      status: "provisional",
      provenanceQuotes: [],
      source: "member",
      visibility: "shareable",
      publishedFrom: "g1",
      publishedAt: "2026-09-04T00:00:00Z",
    },
  ],
};

function renderWithRouter(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockGetGoalSession.mockReset();
  mockGetMyGoals.mockReset();
  mockGetGoalSession.mockResolvedValue(SESSION);
  mockGetMyGoals.mockResolvedValue(NOTHING_PUBLISHED);
});

describe("Summit surface pages", () => {
  it("greets the signed-in user, not the wireframe's fictional one", async () => {
    renderWithRouter(<SummitDashboard />);
    expect(await screen.findByText(/Will/)).toBeInTheDocument();
    // The wireframe persona must not survive anywhere on the page.
    expect(screen.queryByText(/Daniel/i)).toBeNull();
    expect(screen.queryByText(/wired to make messy systems run/i)).toBeNull();
  });

  it("derives discovery progress from the live session", async () => {
    renderWithRouter(<SummitDashboard />);
    expect(await screen.findByText(/2 of 5 categories/i)).toBeInTheDocument();
    expect(screen.getByText(/40% explored/i)).toBeInTheDocument();
  });

  it("points at the first unfinished category, not a fixed one", async () => {
    renderWithRouter(<SummitDashboard />);
    expect(
      await screen.findByText(/Finish the Workplace Situation category/i),
    ).toBeInTheDocument();
  });

  it("renders Discovery from the live categories, with an illustration that names no one", async () => {
    renderWithRouter(<SummitDiscovery />);
    expect(await screen.findByText(/Current Job Situation/i)).toBeInTheDocument();
    expect(screen.getByText(/Career Ambitions/i)).toBeInTheDocument();
    expect(screen.getByText(/1 goal surfaced/i)).toBeInTheDocument();
    expect(screen.queryByText(/Daniel/)).toBeNull();
  });

  it("renders Coaches with the three coaching roles", () => {
    renderWithRouter(<SummitCoaches />);
    expect(screen.getByText("Job Mentor")).toBeInTheDocument();
    expect(screen.getByText("Career Coach")).toBeInTheDocument();
    expect(screen.getByText("PRISM Coach")).toBeInTheDocument();
  });
});

describe("My Goals — two stores, kept apart", () => {
  it("shows an unpublished session goal as a draft, mapping backend vocabulary to labels", async () => {
    renderWithRouter(<SummitGoals />);
    expect(
      await screen.findByText(/Automate the top 3 manual reporting workflows/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Drafts from your interview/i)).toBeInTheDocument();
    // leverages_strength → "Leverages strength"; job → "Current Job".
    expect(screen.getByText(/Leverages strength/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Current Job/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /confirm & publish/i })).toBeInTheDocument();
    // The old mock goal must be gone.
    expect(screen.queryByText(/Lead the ops-reporting redesign/i)).toBeNull();
  });

  it("lists a published goal once — under your goals, not also as a draft", async () => {
    mockGetMyGoals.mockResolvedValue(PUBLISHED);
    renderWithRouter(<SummitGoals />);
    expect(await screen.findByText(/No reviews yet/i)).toBeInTheDocument();
    // The session goal g1 IS publishedFrom of b1, so it is not a draft any more.
    expect(screen.queryByText(/Drafts from your interview/i)).toBeNull();
    expect(screen.getAllByText(/Automate the top 3 manual reporting workflows/i)).toHaveLength(1);
    expect(screen.getByRole("switch", { name: /keep .* private/i })).not.toBeChecked();
    expect(screen.getByRole("button", { name: /unpublish/i })).toBeInTheDocument();
  });

  it("says there are no goals rather than showing someone else's", async () => {
    mockGetGoalSession.mockResolvedValue(EMPTY);
    renderWithRouter(<SummitGoals />);
    expect(await screen.findByText(/No goals yet/i)).toBeInTheDocument();
    // The way out is always offered.
    expect(screen.getByRole("button", { name: /save & publish/i })).toBeInTheDocument();
  });

  it("surfaces a read failure instead of rendering an empty journey", async () => {
    mockGetGoalSession.mockRejectedValue(new Error("boom"));
    renderWithRouter(<SummitGoals />);
    expect(
      await screen.findByText(/couldn't read your goals just now/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No goals yet/i)).toBeNull();
  });

  it("surfaces a shared-record failure the same way", async () => {
    mockGetMyGoals.mockRejectedValue(new Error("boom"));
    renderWithRouter(<SummitGoals />);
    expect(await screen.findByText(/couldn't read your goals just now/i)).toBeInTheDocument();
  });
});

describe("Coming soon — the honest page", () => {
  it("names the three planned panels and renders nobody's sample data", () => {
    renderWithRouter(<SummitComingSoon />);
    expect(screen.getByText("PRISM lens")).toBeInTheDocument();
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText(/Not built yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/sample/i)).toBeNull();
    expect(screen.queryByText(/Daniel/)).toBeNull();
  });
});
