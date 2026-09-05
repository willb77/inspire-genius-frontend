/**
 * The sharing panel (Goals offering, Phase 3).
 *
 * Four states must render DISTINCTLY — loading, error, empty, and, per
 * person, not shared — because on a consent surface an error that looks like
 * "nobody to share with" is the one failure a person cannot detect. The
 * "what they see" preview must be the coach's own card component, imported,
 * so the module is mocked with a marker: a redrawn card would not carry it.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MyGrantRow, PeopleResponse, VisibilityPerson } from "@/types/consent";
import type { MyGoalsResponse } from "@/types/summit";

const svc = {
  getPeople: jest.fn(),
  getMyGrants: jest.fn(),
  getAccessLog: jest.fn(),
  lookupPerson: jest.fn(),
  offerAccess: jest.fn(),
  extendGrant: jest.fn(),
  revokeGrant: jest.fn(),
  respondToRequest: jest.fn(),
};
jest.mock("@/services/consent/visibility.service", () => ({
  getPeople: () => svc.getPeople(),
  getMyGrants: () => svc.getMyGrants(),
  getAccessLog: () => svc.getAccessLog(),
  lookupPerson: (...a: unknown[]) => svc.lookupPerson(...a),
  offerAccess: (...a: unknown[]) => svc.offerAccess(...a),
  extendGrant: (...a: unknown[]) => svc.extendGrant(...a),
  revokeGrant: (...a: unknown[]) => svc.revokeGrant(...a),
  respondToRequest: (...a: unknown[]) => svc.respondToRequest(...a),
}));

const mockGetMyGoals = jest.fn();
jest.mock("@/services/summit/goals.service", () => ({
  getMyGoals: () => mockGetMyGoals(),
  getGoalSession: jest.fn(),
  patchGoal: jest.fn(),
  deleteGoal: jest.fn(),
  createGoal: jest.fn(),
  publishGoal: jest.fn(),
  unpublishGoal: jest.fn(),
  setGoalVisibility: jest.fn(),
}));

// The coach's card, replaced by a marker. The assertion is that the page
// IMPORTS this component for the preview — not that it draws something similar.
jest.mock("@/components/manager/development/tabs/GoalsPanel", () => ({
  CoachGoalCard: ({ goal }: { goal: { title: string } }) => (
    <div data-testid="coach-goal-card">{goal.title}</div>
  ),
}));

import SummitSharing from "@/pages/summit/SummitSharing";

const IN_A_YEAR = new Date(Date.now() + 300 * 86400000).toISOString();

function person(over: Partial<VisibilityPerson> = {}): VisibilityPerson {
  return {
    userId: "u-mgr",
    displayName: "Morgan Manager",
    email: "morgan@example.com",
    kinds: ["manager_of_record"],
    grant: null,
    ...over,
  };
}

const PEOPLE_OK: PeopleResponse["sources"] = {
  managers_of_record: "ok",
  roster_managers: "ok",
  practitioners: "ok",
  requesters: "ok",
};

const MINE: MyGoalsResponse = {
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

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SummitSharing />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  svc.getMyGrants.mockResolvedValue([]);
  svc.getAccessLog.mockResolvedValue([]);
  mockGetMyGoals.mockResolvedValue({ memberId: "m1", goals: [], coverage: [] });
});

describe("the four states", () => {
  it("loading", () => {
    svc.getPeople.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByTestId("sharing-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("sharing-empty")).toBeNull();
    expect(screen.queryByTestId("sharing-error")).toBeNull();
  });

  it("error — never the empty state", async () => {
    svc.getPeople.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByTestId("sharing-error")).toBeInTheDocument();
    expect(screen.queryByTestId("sharing-empty")).toBeNull();
    expect(screen.queryByTestId("sharing-people")).toBeNull();
  });

  it("empty — and still a way to add someone", async () => {
    svc.getPeople.mockResolvedValue({ people: [], sources: PEOPLE_OK });
    renderPage();
    expect(await screen.findByTestId("sharing-empty")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /email address/i })).toBeInTheDocument();
    expect(screen.queryByTestId("sharing-error")).toBeNull();
  });

  it("not shared — per person, with the switch off, and an offer when it is turned on", async () => {
    svc.getPeople.mockResolvedValue({ people: [person()], sources: PEOPLE_OK });
    svc.offerAccess.mockResolvedValue({ id: "g1", status: "granted", mode: "offered" });
    renderPage();
    expect(await screen.findByText("Morgan Manager")).toBeInTheDocument();
    expect(screen.getByText("Not shared")).toBeInTheDocument();
    const sw = screen.getByRole("switch", { name: /share goals with morgan manager/i });
    expect(sw).not.toBeChecked();
    fireEvent.click(sw);
    await waitFor(() =>
      expect(svc.offerAccess).toHaveBeenCalledWith({ granteeUserId: "u-mgr", categories: { goals: true } }),
    );
  });
});

it("a live grant shows Sharing, the expiry and Renew; switching off revokes", async () => {
  svc.getPeople.mockResolvedValue({
    people: [person({ grant: { id: "g1", status: "granted", categories: { goals: true }, expiresAt: IN_A_YEAR, requestedAt: null } })],
    sources: PEOPLE_OK,
  });
  svc.extendGrant.mockResolvedValue({ id: "g1", status: "granted", expires_at: IN_A_YEAR });
  svc.revokeGrant.mockResolvedValue({ id: "g1", status: "revoked" });
  renderPage();
  expect(await screen.findByText("Sharing")).toBeInTheDocument();
  expect(screen.getByText(/^Until /)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /renew for a year/i }));
  await waitFor(() => expect(svc.extendGrant).toHaveBeenCalledWith("g1", 365));
  fireEvent.click(screen.getByRole("switch", { name: /share goals with/i }));
  await waitFor(() => expect(svc.revokeGrant).toHaveBeenCalledWith("g1"));
});

it("an expired grant reads as not shared even though its status says granted", async () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString();
  svc.getPeople.mockResolvedValue({
    people: [person({ grant: { id: "g1", status: "granted", categories: { goals: true }, expiresAt: yesterday, requestedAt: null } })],
    sources: PEOPLE_OK,
  });
  renderPage();
  expect(await screen.findByText("Not shared")).toBeInTheDocument();
});

it("a pending request shows the requester's reason with Share / Decline", async () => {
  const row: MyGrantRow = {
    id: "req1", grantee_user_id: "u-mgr", categories: { goals: true }, reason: "Quarterly 1:1 prep",
    status: "pending", access_basis: "student_consent", consent_holder: "student",
    requested_at: "2026-09-01T00:00:00Z", responded_at: null, expires_at: IN_A_YEAR, revoked_at: null,
  };
  svc.getPeople.mockResolvedValue({
    people: [person({ kinds: ["requester"], grant: { id: "req1", status: "pending", categories: { goals: true }, expiresAt: IN_A_YEAR, requestedAt: row.requested_at } })],
    sources: PEOPLE_OK,
  });
  svc.getMyGrants.mockResolvedValue([row]);
  svc.respondToRequest.mockResolvedValue({ id: "req1", status: "granted" });
  renderPage();
  expect(await screen.findByTestId("sharing-requests")).toBeInTheDocument();
  expect(screen.getByText(/Quarterly 1:1 prep/)).toBeInTheDocument();
  // No switch for a pending person — the answer is the request's, not a toggle.
  expect(screen.queryByRole("switch")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /^share my goals$/i }));
  await waitFor(() => expect(svc.respondToRequest).toHaveBeenCalledWith("req1", true, { goals: true }));
});

it("reports an unreadable source instead of rendering it as empty", async () => {
  svc.getPeople.mockResolvedValue({
    people: [person()],
    sources: { ...PEOPLE_OK, roster_managers: "unavailable" },
  });
  renderPage();
  expect(await screen.findByText(/It is not empty — it is unread/i)).toBeInTheDocument();
});

describe("what they see", () => {
  it("renders the coach's own card component for a shareable goal", async () => {
    svc.getPeople.mockResolvedValue({ people: [], sources: PEOPLE_OK });
    mockGetMyGoals.mockResolvedValue(MINE);
    renderPage();
    const card = await screen.findByTestId("coach-goal-card");
    expect(card).toHaveTextContent("Lead the reporting redesign");
    expect(screen.getByTestId("sharing-preview")).toContainElement(card);
  });

  it("shows nothing for a private goal — private means hidden even from people you share with", async () => {
    svc.getPeople.mockResolvedValue({ people: [], sources: PEOPLE_OK });
    mockGetMyGoals.mockResolvedValue({ ...MINE, goals: [{ ...MINE.goals[0], visibility: "private" }] });
    renderPage();
    expect(await screen.findByText(/Publish a goal and it will show here/i)).toBeInTheDocument();
    expect(screen.queryByTestId("coach-goal-card")).toBeNull();
  });
});

describe("add a person", () => {
  it("finds ONE exact email, then shares; 404 says so", async () => {
    svc.getPeople.mockResolvedValue({ people: [], sources: PEOPLE_OK });
    svc.lookupPerson.mockRejectedValueOnce({ response: { status: 404 } });
    renderPage();
    const input = await screen.findByRole("textbox", { name: /email address/i });
    fireEvent.change(input, { target: { value: "nobody@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /find/i }));
    expect(await screen.findByText(/No account with that email/i)).toBeInTheDocument();

    svc.lookupPerson.mockResolvedValueOnce({ userId: "u9", displayName: "Coach Nine", email: "nine@example.com" });
    svc.offerAccess.mockResolvedValue({ id: "g9", status: "granted", mode: "offered" });
    fireEvent.change(input, { target: { value: "nine@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /find/i }));
    expect(await screen.findByText("Coach Nine")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /share my goals/i }));
    await waitFor(() => expect(svc.offerAccess).toHaveBeenCalledWith({ granteeUserId: "u9", categories: { goals: true } }));
    expect(await screen.findByText(/Shared with Coach Nine/)).toBeInTheDocument();
  });
});

describe("Who has looked (Phase 5)", () => {
  it("lists reads by name where known and by id where not, newest first as given", async () => {
    svc.getPeople.mockResolvedValue({
      people: [{ userId: "m1", displayName: "Mo Manager", email: "mo@example.com", kinds: ["manager_of_record"], grant: null }],
      sources: {},
    });
    svc.getAccessLog.mockResolvedValue([
      { viewer_user_id: "m1", categories_viewed: ["goals"], surface: "growth:goals", viewed_at: "2026-09-04T14:00:00Z" },
      { viewer_user_id: "abcdef12-0000-4000-8000-000000000000", categories_viewed: ["goals"], surface: "growth:goals:super-admin", viewed_at: "2026-09-04T13:00:00Z" },
    ]);
    renderPage();
    const list = await screen.findByRole("list", { name: "Access log" });
    expect(list).toHaveTextContent("Mo Manager");
    expect(list).toHaveTextContent("read your goals");
    expect(list).toHaveTextContent("Someone (abcdef12…)");
    expect(list).toHaveTextContent("platform admin");
  });

  it("names the grant-side events in the member's words — share and renew are not 'looked (surface)'", async () => {
    // The backend logs the member's own offer as surface "offered" and a renewal as
    // "extended". Found on stable 2026-09-04: "extended" had no label, so a renewal
    // read "looked (extended)". Every surface the backend writes needs a label here.
    svc.getPeople.mockResolvedValue({
      people: [{ userId: "c1", displayName: "SB Verify", email: "sb.verify.coach@example.com", kinds: ["added"], grant: null }],
      sources: {},
    });
    svc.getAccessLog.mockResolvedValue([
      { viewer_user_id: "c1", categories_viewed: ["goals"], surface: "extended", viewed_at: "2026-09-05T01:41:28Z" },
      { viewer_user_id: "c1", categories_viewed: ["goals"], surface: "offered", viewed_at: "2026-09-05T01:41:24Z" },
    ]);
    renderPage();
    const list = await screen.findByRole("list", { name: "Access log" });
    expect(list).toHaveTextContent("had access renewed by you");
    expect(list).toHaveTextContent("was given access by you");
    expect(list).not.toHaveTextContent("looked (");
  });

  it("says the log is unread, not empty, when it cannot be read", async () => {
    svc.getAccessLog.mockRejectedValue(new Error("down"));
    renderPage();
    expect(await screen.findByTestId("who-has-looked-error")).toBeInTheDocument();
    expect(screen.queryByTestId("who-has-looked-empty")).not.toBeInTheDocument();
  });

  it("says nobody has looked when the log is empty", async () => {
    renderPage();
    expect(await screen.findByTestId("who-has-looked-empty")).toBeInTheDocument();
  });
});
