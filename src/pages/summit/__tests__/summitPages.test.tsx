import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { SummitSession } from "@/types/summit";

// Summit reads one live endpoint (GET /v1/agents/goals/session). Mock the
// service rather than the hook so the hook's own derivation — category order,
// goal counts, the "first incomplete" next step — is exercised rather than
// stubbed past. That derivation is where the bugs would be.
const mockGetGoalSession = jest.fn();
jest.mock("@/services/summit/goals.service", () => ({
  getGoalSession: () => mockGetGoalSession(),
  patchGoal: jest.fn(),
  deleteGoal: jest.fn(),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Will Brown", email: "willb77@3pp.com" } }),
}));

// The chat panel opens a real transport; it is covered by its own tests.
jest.mock("@/pages/summit/components/MeridianPanel", () => ({
  __esModule: true,
  default: () => <div />,
}));

import SummitDashboard from "@/pages/summit/SummitDashboard";
import SummitDiscovery from "@/pages/summit/SummitDiscovery";
import SummitPrism from "@/pages/summit/SummitPrism";
import SummitGoals from "@/pages/summit/SummitGoals";
import SummitCoaches from "@/pages/summit/SummitCoaches";
import SummitProgress from "@/pages/summit/SummitProgress";
import SummitDocuments from "@/pages/summit/SummitDocuments";

/** A session shaped exactly like the backend's, mid-way through discovery. */
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
  mockGetGoalSession.mockResolvedValue(SESSION);
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
    // 2 of 5 explored → 40%. Previously hardcoded regardless of state.
    expect(await screen.findByText(/2 of 5 categories/i)).toBeInTheDocument();
    expect(screen.getByText(/40% explored/i)).toBeInTheDocument();
  });

  it("points at the first unfinished category, not a fixed one", async () => {
    renderWithRouter(<SummitDashboard />);
    // history + job are explored; workplace is the first that is not.
    expect(
      await screen.findByText(/Finish the Workplace Situation category/i),
    ).toBeInTheDocument();
  });

  it("renders Discovery from the live categories", async () => {
    renderWithRouter(<SummitDiscovery />);
    expect(await screen.findByText(/Current Job Situation/i)).toBeInTheDocument();
    expect(screen.getByText(/Career Ambitions/i)).toBeInTheDocument();
    // Goal counts are derived per category, not fixed.
    expect(screen.getByText(/1 goal surfaced/i)).toBeInTheDocument();
  });

  it("renders the live goal, mapping backend vocabulary to labels", async () => {
    renderWithRouter(<SummitGoals />);
    expect(
      await screen.findByText(/Automate the top 3 manual reporting workflows/i),
    ).toBeInTheDocument();
    // leverages_strength → "Leverages strength"; job → "Current Job".
    expect(screen.getByText(/Leverages strength/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Job/i)).toBeInTheDocument();
    // The old mock goal must be gone.
    expect(screen.queryByText(/Lead the ops-reporting redesign/i)).toBeNull();
  });

  it("says there are no goals rather than showing someone else's", async () => {
    mockGetGoalSession.mockResolvedValue(EMPTY);
    renderWithRouter(<SummitGoals />);
    expect(await screen.findByText(/No goals yet/i)).toBeInTheDocument();
  });

  it("surfaces a read failure instead of rendering an empty journey", async () => {
    mockGetGoalSession.mockRejectedValue(new Error("boom"));
    renderWithRouter(<SummitGoals />);
    expect(
      await screen.findByText(/couldn't read your goals just now/i),
    ).toBeInTheDocument();
  });

  // The panels below have no live source yet. What matters is that they never
  // read as a statement about the person looking at them.
  it("labels the PRISM lens as a sample", async () => {
    renderWithRouter(<SummitPrism />);
    expect(await screen.findByText(/Underlying vs Adapted vs Consistent/i)).toBeInTheDocument();
    expect(screen.getByText(/This is a sample, not your data/i)).toBeInTheDocument();
  });

  it("labels Progress as a sample", () => {
    renderWithRouter(<SummitProgress />);
    expect(screen.getByText(/Your living goal plan/i)).toBeInTheDocument();
    expect(screen.getByText(/This is a sample, not your data/i)).toBeInTheDocument();
  });

  it("warns before the document writer's drafts can be copied or downloaded", () => {
    renderWithRouter(<SummitDocuments />);
    for (const name of ["Résumé", "CV", "Professional Bio", "Job History", "Wikipedia Article", "LinkedIn Profile"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: /build/i })).toBeInTheDocument();
    // These drafts are a fictional person's; they must not read as the user's.
    expect(screen.getByText(/made-up person/i)).toBeInTheDocument();
  });

  it("renders Coaches with the three coaching roles", () => {
    renderWithRouter(<SummitCoaches />);
    expect(screen.getByText(/Job Mentor/i)).toBeInTheDocument();
    expect(screen.getByText(/Career Coach/i)).toBeInTheDocument();
    expect(screen.getByText(/PRISM Coach/i)).toBeInTheDocument();
  });

  it("counts each coach's goals from the live session", async () => {
    // Was hardcoded 2/1/1 for everybody, from the wireframe. The single goal in
    // SESSION is owned by job_mentor, so the other two must read zero.
    renderWithRouter(<SummitCoaches />);
    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
    // The count and its label are separate elements, so assert the singular
    // label exists alongside the two plural ones rather than as one string.
    expect(screen.getByText("goal")).toBeInTheDocument();
    expect(screen.getAllByText("goals")).toHaveLength(2);
  });
});
