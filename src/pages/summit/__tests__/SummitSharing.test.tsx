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
  expect(await screen.findByText("Sharing goals")).toBeInTheDocument();
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
  expect(screen.getByText(/wants to see your goals\./)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^share my goals$/i }));
  // No categories on approve: the backend stores exactly what was asked.
  await waitFor(() => expect(svc.respondToRequest).toHaveBeenCalledWith("req1", true, undefined));
});

// ── TDS-1c: the PRISM profile has the same door as goals ────────────────────
//
// Two backend facts shape these tests. ONE live consent row exists per
// (member, person) and an offer REPLACES its category set — so a switch must
// send the union of what is live and what was toggled, or it strips the other
// category. And approving a request with NO categories stores what was asked —
// so a PRISM request must not be answered with a hard-coded goals grant, which
// is exactly what shipped before (a manager asked for PRISM, the member
// approved, a goals grant was written, and nobody was told).
describe("PRISM profile (TDS-1c)", () => {
  const grantWith = (categories: MyGrantRow["categories"]) =>
    person({ grant: { id: "g1", status: "granted", categories: categories as never, expiresAt: IN_A_YEAR, requestedAt: null } });

  it("a PRISM request says so, and approving sends no categories", async () => {
    const row: MyGrantRow = {
      id: "req2", grantee_user_id: "u-mgr", categories: { prism: true }, reason: "Development conversation",
      status: "pending", access_basis: "student_consent", consent_holder: "student",
      requested_at: "2026-09-15T00:00:00Z", responded_at: null, expires_at: IN_A_YEAR, revoked_at: null,
    };
    svc.getPeople.mockResolvedValue({
      people: [person({ kinds: ["requester"], grant: { id: "req2", status: "pending", categories: { prism: true }, expiresAt: IN_A_YEAR, requestedAt: row.requested_at } })],
      sources: PEOPLE_OK,
    });
    svc.getMyGrants.mockResolvedValue([row]);
    svc.respondToRequest.mockResolvedValue({ id: "req2", status: "granted" });
    renderPage();
    expect(await screen.findByText(/wants to see your PRISM profile\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /share my goals/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^share my PRISM profile$/i }));
    await waitFor(() => expect(svc.respondToRequest).toHaveBeenCalledWith("req2", true, undefined));
  });

  it("reads the requested categories when the row carries them as a JSON string", async () => {
    const row: MyGrantRow = {
      id: "req3", grantee_user_id: "u-mgr", categories: '{"goals": true, "prism": true}', reason: null,
      status: "pending", access_basis: "student_consent", consent_holder: "student",
      requested_at: "2026-09-15T00:00:00Z", responded_at: null, expires_at: IN_A_YEAR, revoked_at: null,
    };
    svc.getPeople.mockResolvedValue({ people: [person({ kinds: ["requester"], grant: { id: "req3", status: "pending", categories: {}, expiresAt: null, requestedAt: null } })], sources: PEOPLE_OK });
    svc.getMyGrants.mockResolvedValue([row]);
    renderPage();
    expect(await screen.findByText(/wants to see your goals and PRISM profile\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^share my goals and PRISM profile$/i })).toBeInTheDocument();
  });

  it("turning PRISM on for someone who already sees goals offers BOTH — never PRISM alone", async () => {
    svc.getPeople.mockResolvedValue({ people: [grantWith({ goals: true })], sources: PEOPLE_OK });
    svc.offerAccess.mockResolvedValue({ id: "g1", status: "granted", mode: "refreshed" });
    renderPage();
    expect(await screen.findByText("Sharing goals")).toBeInTheDocument();
    const prism = screen.getByRole("switch", { name: /share PRISM profile with morgan manager/i });
    expect(prism).not.toBeChecked();
    fireEvent.click(prism);
    await waitFor(() =>
      expect(svc.offerAccess).toHaveBeenCalledWith({ granteeUserId: "u-mgr", categories: { goals: true, prism: true } }),
    );
    expect(svc.revokeGrant).not.toHaveBeenCalled();
  });

  it("turning PRISM off while goals stay shared offers goals alone — not a revoke", async () => {
    svc.getPeople.mockResolvedValue({ people: [grantWith({ goals: true, prism: true })], sources: PEOPLE_OK });
    svc.offerAccess.mockResolvedValue({ id: "g1", status: "granted", mode: "refreshed" });
    renderPage();
    expect(await screen.findByText("Sharing goals and PRISM profile")).toBeInTheDocument();
    const prism = screen.getByRole("switch", { name: /share PRISM profile with/i });
    expect(prism).toBeChecked();
    fireEvent.click(prism);
    await waitFor(() =>
      expect(svc.offerAccess).toHaveBeenCalledWith({ granteeUserId: "u-mgr", categories: { goals: true } }),
    );
    expect(svc.revokeGrant).not.toHaveBeenCalled();
  });

  it("turning off the last shared category revokes the row", async () => {
    svc.getPeople.mockResolvedValue({ people: [grantWith({ prism: true })], sources: PEOPLE_OK });
    svc.revokeGrant.mockResolvedValue({ id: "g1", status: "revoked" });
    renderPage();
    expect(await screen.findByText("Sharing PRISM profile")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /share goals with/i })).not.toBeChecked();
    fireEvent.click(screen.getByRole("switch", { name: /share PRISM profile with/i }));
    await waitFor(() => expect(svc.revokeGrant).toHaveBeenCalledWith("g1"));
    expect(svc.offerAccess).not.toHaveBeenCalled();
  });

  it("a person with no grant gets an offer for exactly the category toggled", async () => {
    svc.getPeople.mockResolvedValue({ people: [person()], sources: PEOPLE_OK });
    svc.offerAccess.mockResolvedValue({ id: "g2", status: "granted", mode: "offered" });
    renderPage();
    expect(await screen.findByText("Not shared")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: /share PRISM profile with/i }));
    await waitFor(() =>
      expect(svc.offerAccess).toHaveBeenCalledWith({ granteeUserId: "u-mgr", categories: { prism: true } }),
    );
  });
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

describe("six switches, each honest about enforcement (S-2)", () => {
  const withGrant = (categories: Record<string, boolean>) =>
    person({ grant: { id: "g1", status: "granted", categories: categories as never, expiresAt: IN_A_YEAR, requestedAt: null } });

  it("offers all six, per person", async () => {
    svc.getPeople.mockResolvedValue({ people: [person()], sources: PEOPLE_OK });
    renderPage();
    for (const noun of ["goals", "PRISM profile", "assessments", "profile documents", "interview results", "development plan"]) {
      expect(await screen.findByRole("switch", { name: new RegExp(`share ${noun} with morgan manager`, "i") })).toBeInTheDocument();
    }
  });

  it("marks exactly the four that do not yet decide access, and says why", async () => {
    svc.getPeople.mockResolvedValue({ people: [person()], sources: PEOPLE_OK });
    renderPage();
    const note = await screen.findByTestId("not-enforced-note");
    expect(note).toHaveTextContent(/Assessments, Profile, Interviews, Development: your choice is saved now/);
    expect(note).toHaveTextContent(/can currently still see these through their role/);
    for (const key of ["assessments", "artefacts", "interviews", "development"]) {
      expect(screen.getByTestId(`not-enforced-${key}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId("not-enforced-goals")).toBeNull();
    expect(screen.queryByTestId("not-enforced-prism")).toBeNull();
  });

  it("turning Development on keeps what is already shared", async () => {
    svc.getPeople.mockResolvedValue({ people: [withGrant({ goals: true, prism: true })], sources: PEOPLE_OK });
    svc.offerAccess.mockResolvedValue({ id: "g1", status: "granted", mode: "refreshed" });
    renderPage();
    fireEvent.click(await screen.findByRole("switch", { name: /share development plan with/i }));
    await waitFor(() =>
      expect(svc.offerAccess).toHaveBeenCalledWith({
        granteeUserId: "u-mgr", categories: { goals: true, prism: true, development: true },
      }),
    );
  });

  it("names a live interviews grant in the row's summary", async () => {
    svc.getPeople.mockResolvedValue({ people: [withGrant({ interviews: true })], sources: PEOPLE_OK });
    renderPage();
    expect(await screen.findByText("Sharing interview results")).toBeInTheDocument();
  });
});

describe("add a person", () => {
  it("does not send the member to the email form to reach their coach", async () => {
    svc.getPeople.mockResolvedValue({ people: [], sources: PEOPLE_OK });
    renderPage();
    expect(await screen.findByText(/Your coach doesn.t need one/i)).toBeInTheDocument();
    expect(screen.queryByText(/coach outside your organisation/i)).not.toBeInTheDocument();
  });

  it("lists a linked coach with its own switches, no email typed", async () => {
    svc.getPeople.mockResolvedValue({
      people: [person({ userId: "u-coach", displayName: "Casey Coach", kinds: ["practitioner"] })],
      sources: PEOPLE_OK,
    });
    renderPage();
    expect(await screen.findByText("Casey Coach")).toBeInTheDocument();
    // Relation and email both shown. TDS-D3 split them onto their own lines so
    // each kind could carry its basis, so this asserts the two facts rather
    // than the single string they used to share.
    expect(screen.getByTestId("basis-u-coach")).toHaveTextContent("Your coach");
    expect(screen.getByText("morgan@example.com")).toBeInTheDocument();
    expect(svc.lookupPerson).not.toHaveBeenCalled();
  });

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

/**
 * Where a candidate's claim comes from (TDS-D3).
 *
 * The four kinds reach this list by four routes of different authority, and a
 * member deciding whether to share their behavioural profile is entitled to
 * know which one they are looking at. `manager_of_record` is the
 * organisation's record of the reporting line; `roster_manager` is a
 * manager's own assertion that nothing checks. These tests assert that the
 * page says so, in the member's words, for every kind — and that it never
 * leaks the API's own vocabulary, which is what it showed before.
 */
describe("the basis of each candidate's claim", () => {
  it("a manager of record is attributed to the organisation's records", async () => {
    svc.getPeople.mockResolvedValue({
      people: [person({ userId: "u-mor", displayName: "Rowan Avery", kinds: ["manager_of_record"] })],
      sources: PEOPLE_OK,
    });
    renderPage();
    const basis = await screen.findByTestId("basis-u-mor");
    expect(basis).toHaveTextContent("Your manager");
    expect(basis).toHaveTextContent("Your organisation's records show you report to them.");
  });

  it("a roster manager is attributed to the manager's own list, not the organisation's records", async () => {
    svc.getPeople.mockResolvedValue({
      people: [person({ userId: "u-ros", displayName: "Devi Marchetti", kinds: ["roster_manager"] })],
      sources: PEOPLE_OK,
    });
    renderPage();
    const basis = await screen.findByTestId("basis-u-ros");
    expect(basis).toHaveTextContent("Lists you on their team");
    expect(basis).toHaveTextContent("They added you to a team list they keep here");
    expect(basis).toHaveTextContent("their own list, not your organisation's records");
    // The distinction is the whole point: a roster entry must not borrow the
    // manager-of-record sentence.
    expect(basis).not.toHaveTextContent("records show you report to them");
  });

  it("a coach and a requester each state their own basis", async () => {
    svc.getPeople.mockResolvedValue({
      people: [
        person({ userId: "u-coach2", displayName: "Kit Solberg", kinds: ["practitioner"] }),
        person({ userId: "u-req2", displayName: "Noor Haddad", kinds: ["requester"] }),
      ],
      sources: PEOPLE_OK,
    });
    renderPage();
    expect(await screen.findByTestId("basis-u-coach2")).toHaveTextContent("They added you as a client.");
    expect(screen.getByTestId("basis-u-req2")).toHaveTextContent("They asked you to share with them.");
  });

  it("someone who is both shows both bases — one does not cancel the other", async () => {
    svc.getPeople.mockResolvedValue({
      people: [
        person({
          userId: "u-both",
          displayName: "Jules Ferreira",
          kinds: ["manager_of_record", "roster_manager"],
        }),
      ],
      sources: PEOPLE_OK,
    });
    renderPage();
    const basis = await screen.findByTestId("basis-u-both");
    expect(basis).toHaveTextContent("Your organisation's records show you report to them.");
    expect(basis).toHaveTextContent("They added you to a team list they keep here");
    expect(basis.querySelectorAll("li")).toHaveLength(2);
  });

  it("an unrecognised kind says the basis is unknown instead of rendering blank", async () => {
    // `kinds.map((k) => LABEL[k]).join(" · ")` on an unknown key is the empty
    // string: a row with no basis at all, which reads exactly like a row that
    // was never meant to have one.
    svc.getPeople.mockResolvedValue({
      people: [person({ userId: "u-new", displayName: "Sasha Lindqvist", kinds: ["delegated_reader" as never] })],
      sources: PEOPLE_OK,
    });
    renderPage();
    const basis = await screen.findByTestId("basis-u-new");
    expect(basis).toHaveTextContent("On your list");
    expect(basis).toHaveTextContent("We can't say how they came to be on this list.");
    expect(basis.textContent?.trim()).not.toBe("");
  });

  it("never shows the API's own vocabulary for a kind", async () => {
    svc.getPeople.mockResolvedValue({
      people: [
        person({ userId: "u-v1", kinds: ["manager_of_record", "roster_manager"] }),
        person({ userId: "u-v2", displayName: "Tam Oyelaran", kinds: ["practitioner"] }),
      ],
      sources: PEOPLE_OK,
    });
    const { container } = renderPage();
    await screen.findByTestId("basis-u-v1");
    expect(container.textContent).not.toMatch(/manager_of_record|roster_manager|practitioner|requester/);
    // ...and the member is told the line under each name means something.
    expect(screen.getByTestId("basis-note")).toHaveTextContent("how they came to be on this list");
  });

  it("names the source it could not read, so a short list is not read as a complete one", async () => {
    // Already honoured before TDS-D3; asserted here because the naming is what
    // distinguishes "your roster managers are missing" from a generic failure.
    svc.getPeople.mockResolvedValue({
      people: [person()],
      sources: { ...PEOPLE_OK, roster_managers: "unavailable" },
    });
    renderPage();
    expect(await screen.findByText(/managers who added you to their team list/i)).toBeInTheDocument();
    expect(screen.getByText(/It is not empty — it is unread/i)).toBeInTheDocument();
  });
});
