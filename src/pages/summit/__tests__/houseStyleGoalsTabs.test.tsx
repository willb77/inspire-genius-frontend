/**
 * House style, goals area (S2b) — Goals Studio in three tabs, behind
 * isHouseStyleOn("goals").
 *
 * Pinned both ways:
 *  - switch OFF: the seven pills, and every one of the four folded paths stays
 *    where it is (GoalsStudioLayout.test.tsx pins the seven-pill list as well,
 *    unmodified);
 *  - switch ON: three pills; Overview and Discovery go to the interview,
 *    Coaches and Coming soon go to My goals; the interview carries a progress
 *    strip read from the same session query, and a person with progress never
 *    sees what reads as a fresh start.
 */
import { render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { SummitSession } from "@/types/summit";
import { ROUTES } from "@/constants/routes";
import { houseGoalsRedirectFor, HOUSE_GOALS_REDIRECTS } from "@/pages/summit/house/goalsHouseRoutes";

const mockGetGoalSession = jest.fn();
jest.mock("@/services/summit/goals.service", () => ({
  getGoalSession: () => mockGetGoalSession(),
  patchGoal: jest.fn(),
  deleteGoal: jest.fn(),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Test Person", email: "test@example.com", role: "user" } }),
}));

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="user-layout">{children}</div>,
}));
jest.mock("@/layouts/UnifiedLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => <div data-testid="unified-layout">{children}</div>,
}));

// The interview panel belongs to direction-setting and has its own tests. The
// stand-in reads the same session hook, so the test can prove the strip adds
// no second server call.
jest.mock("@/components/direction-setting/GoalInterviewPanel", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
  const { useGoalSession } = require("@/hooks/summit/useGoalSession");
  return {
    __esModule: true,
    default: function MockPanel() {
      useGoalSession();
      return <div data-testid="interview-panel">interview</div>;
    },
  };
});

import GoalsStudioLayout from "@/pages/summit/GoalsStudioLayout";
import SummitInterview from "@/pages/summit/SummitInterview";

type Status = "todo" | "active" | "explored";
function session(statuses: Status[], goals = 0): SummitSession {
  const keys = ["history", "job", "workplace", "ambitions", "personal"] as const;
  const labels = ["Career History", "Current Job Situation", "Workplace Situation", "Career Ambitions", "Personal Goals"];
  const categories = Object.fromEntries(
    keys.map((k, i) => [k, { label: labels[i], status: statuses[i], answers: [], summary: "" }]),
  ) as SummitSession["categories"];
  return {
    categories,
    goals: Array.from({ length: goals }, (_, i) => ({ goal_id: `g${i}` })),
  } as unknown as SummitSession;
}

function setSwitch(on: boolean) {
  localStorage.setItem("house_style_goals", on ? "true" : "false");
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderLayoutAt(path: string) {
  return render(
    <QueryClientProvider client={client()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/my/goals" element={<GoalsStudioLayout />}>
            <Route index element={<div data-testid="page">goals</div>} />
            <Route path="overview" element={<div data-testid="page">overview</div>} />
            <Route path="discovery" element={<div data-testid="page">discovery</div>} />
            <Route path="interview" element={<div data-testid="page">interview</div>} />
            <Route path="sharing" element={<div data-testid="page">sharing</div>} />
            <Route path="coaches" element={<div data-testid="page">coaches</div>} />
            <Route path="coming-soon" element={<div data-testid="page">coming-soon</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderInterview() {
  return render(
    <QueryClientProvider client={client()}>
      <MemoryRouter>
        <SummitInterview />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function pillLabels() {
  const nav = screen.getByRole("navigation", { name: "Goals Studio sections" });
  return within(nav).getAllByRole("link").map((a) => a.textContent?.trim());
}

beforeEach(() => {
  localStorage.clear();
  mockGetGoalSession.mockReset();
  mockGetGoalSession.mockResolvedValue(session(["todo", "todo", "todo", "todo", "todo"]));
});

describe("houseGoalsRedirectFor", () => {
  it("maps the four folded sections and nothing else", () => {
    expect(houseGoalsRedirectFor("/my/goals/overview")).toBe(ROUTES.MY_GOALS.INTERVIEW);
    expect(houseGoalsRedirectFor("/my/goals/discovery/")).toBe(ROUTES.MY_GOALS.INTERVIEW);
    expect(houseGoalsRedirectFor("/my/goals/coaches")).toBe(ROUTES.MY_GOALS.BASE);
    expect(houseGoalsRedirectFor("/my/goals/coming-soon")).toBe(ROUTES.MY_GOALS.BASE);
    for (const stays of ["/my/goals", "/my/goals/interview", "/my/goals/sharing", "/my/goals/g1/roadmap", "/"]) {
      expect(houseGoalsRedirectFor(stays)).toBeNull();
    }
    expect(Object.keys(HOUSE_GOALS_REDIRECTS)).toHaveLength(4);
  });
});

describe("Goals Studio layout — switch OFF (today)", () => {
  it("shows the seven pills", async () => {
    renderLayoutAt("/my/goals");
    expect(pillLabels()).toEqual([
      "My Goals", "Interview", "Sharing", "Overview", "Discovery", "Coaches", "Coming soon",
    ]);
  });

  it.each(["overview", "discovery", "coaches", "coming-soon"])("leaves /my/goals/%s where it is", (p) => {
    setSwitch(false);
    renderLayoutAt(`/my/goals/${p}`);
    expect(screen.getByTestId("page")).toHaveTextContent(p);
  });
});

describe("Goals Studio layout — switch ON (three tabs)", () => {
  beforeEach(() => setSwitch(true));

  it("shows three pills: My goals · Talk it through · Who can see them", () => {
    renderLayoutAt("/my/goals");
    expect(pillLabels()).toEqual(["My goals", "Talk it through", "Who can see them"]);
    const nav = screen.getByRole("navigation", { name: "Goals Studio sections" });
    expect(within(nav).getByRole("link", { name: /Talk it through/ })).toHaveAttribute("href", ROUTES.MY_GOALS.INTERVIEW);
    expect(within(nav).getByRole("link", { name: /Who can see them/ })).toHaveAttribute("href", ROUTES.MY_GOALS.SHARING);
    expect(within(nav).getByRole("link", { name: /My goals/ })).toHaveAttribute("href", ROUTES.MY_GOALS.BASE);
  });

  it("badges the tabs from the live session", async () => {
    mockGetGoalSession.mockResolvedValue(session(["explored", "explored", "active", "todo", "todo"], 3));
    renderLayoutAt("/my/goals");
    const nav = screen.getByRole("navigation", { name: "Goals Studio sections" });
    await waitFor(() => expect(within(nav).getByRole("link", { name: /Talk it through/ })).toHaveTextContent("2/5"));
    expect(within(nav).getByRole("link", { name: /My goals/ })).toHaveTextContent("3");
  });

  it.each([
    ["overview", "interview"],
    ["discovery", "interview"],
    ["coaches", "goals"],
    ["coming-soon", "goals"],
  ])("sends /my/goals/%s to the %s page", (from, to) => {
    renderLayoutAt(`/my/goals/${from}`);
    expect(screen.getByTestId("page")).toHaveTextContent(new RegExp(`^${to}$`));
  });

  it.each(["interview", "sharing"])("leaves /my/goals/%s where it is", (p) => {
    renderLayoutAt(`/my/goals/${p}`);
    expect(screen.getByTestId("page")).toHaveTextContent(p);
  });
});

describe("Talk it through — progress strip", () => {
  it("switch OFF: the interview renders as today, with no strip", async () => {
    renderInterview();
    expect(await screen.findByTestId("interview-panel")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading" })).not.toBeInTheDocument();
    // Let the session read settle, so a strip that renders late is caught too.
    await waitFor(() => expect(mockGetGoalSession).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("goals-progress-strip")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Your progress" })).not.toBeInTheDocument();
  });

  describe("switch ON", () => {
    beforeEach(() => setSwitch(true));

    it("shows a person's progress above the interview, never a fresh start", async () => {
      mockGetGoalSession.mockResolvedValue(session(["explored", "active", "todo", "todo", "todo"], 2));
      renderInterview();
      const strip = await screen.findByRole("region", { name: "Your progress" });
      expect(strip).toHaveTextContent("1 of 5 areas explored");
      expect(strip).toHaveTextContent("Carrying on with Current Job Situation.");
      expect(within(strip).getByRole("link", { name: /2 goals drafted/ })).toHaveAttribute("href", ROUTES.MY_GOALS.BASE);
      expect(strip).toHaveTextContent("Career History: Done");
      expect(strip).toHaveTextContent("Current Job Situation: In progress");
      expect(strip).not.toHaveTextContent(/haven't started/);
      // Above the conversation.
      const panel = screen.getByTestId("interview-panel");
      expect(strip.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("reads the same session as the interview — one GET /session, no new call", async () => {
      mockGetGoalSession.mockResolvedValue(session(["explored", "active", "todo", "todo", "todo"]));
      renderInterview();
      await screen.findByRole("region", { name: "Your progress" });
      expect(mockGetGoalSession).toHaveBeenCalledTimes(1);
    });

    it("names the next area when the last one is finished and nothing is active", async () => {
      mockGetGoalSession.mockResolvedValue(session(["explored", "todo", "todo", "todo", "todo"]));
      renderInterview();
      const strip = await screen.findByRole("region", { name: "Your progress" });
      expect(strip).toHaveTextContent("Next up: Current Job Situation.");
      expect(strip).not.toHaveTextContent(/goals? drafted/);
    });

    it("counts goals as progress even before an area is explored", async () => {
      mockGetGoalSession.mockResolvedValue(session(["todo", "todo", "todo", "todo", "todo"], 1));
      renderInterview();
      const strip = await screen.findByRole("region", { name: "Your progress" });
      expect(strip).not.toHaveTextContent(/haven't started/);
      expect(within(strip).getByRole("link", { name: /1 goal drafted/ })).toBeInTheDocument();
    });

    it("an area in progress is progress, even with nothing explored yet", async () => {
      mockGetGoalSession.mockResolvedValue(session(["active", "todo", "todo", "todo", "todo"]));
      renderInterview();
      const strip = await screen.findByRole("region", { name: "Your progress" });
      expect(strip).not.toHaveTextContent(/haven't started/);
      expect(strip).toHaveTextContent("Carrying on with Career History.");
    });

    it("says so when every area is explored", async () => {
      mockGetGoalSession.mockResolvedValue(session(["explored", "explored", "explored", "explored", "explored"], 4));
      renderInterview();
      const strip = await screen.findByRole("region", { name: "Your progress" });
      expect(strip).toHaveTextContent("5 of 5 areas explored");
      expect(strip).toHaveTextContent("Every area is explored.");
    });

    it("says 'not started' only when the read succeeded and nothing has moved", async () => {
      renderInterview();
      const strip = await screen.findByRole("region", { name: "Your progress" });
      expect(strip).toHaveTextContent("0 of 5 areas explored");
      expect(strip).toHaveTextContent("You haven't started yet. The conversation below begins with Career History.");
    });

    it("a failed read is an error, not a fresh start", async () => {
      mockGetGoalSession.mockRejectedValue(new Error("boom"));
      renderInterview();
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("We couldn't read your progress just now. Nothing you've worked through has been lost.");
      expect(screen.queryByText(/haven't started/)).not.toBeInTheDocument();
      expect(screen.queryByText(/0 of/)).not.toBeInTheDocument();
      expect(screen.getByTestId("interview-panel")).toBeInTheDocument();
    });

    it("shows loading while the session is read", () => {
      mockGetGoalSession.mockReturnValue(new Promise(() => undefined));
      renderInterview();
      expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
      expect(screen.queryByText(/haven't started/)).not.toBeInTheDocument();
    });
  });
});
