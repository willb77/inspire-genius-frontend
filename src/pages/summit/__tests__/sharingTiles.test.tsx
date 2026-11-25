/**
 * The "See Access" tile on the sharing page (Bill, 2026-11-23). The other
 * sharing suites replace the Radix dialog with an always-open passthrough so
 * they can reach the controls inside; THIS suite uses the real dialog, because
 * the one thing it must prove is that a person's controls are behind the pill
 * and that clicking it really opens them.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { VisibilityPerson } from "@/types/consent";

const svc = {
  getPeople: jest.fn(),
  getMyGrants: jest.fn(),
  getAccessLog: jest.fn(),
  getCategories: jest.fn(),
  getMyLinkRequests: jest.fn(),
};
jest.mock("@/services/consent/visibility.service", () => ({
  getPeople: () => svc.getPeople(),
  getMyGrants: () => svc.getMyGrants(),
  getAccessLog: () => svc.getAccessLog(),
  // D-14: the paged log, emulated over the same rows: the server filters by viewer.
  getAccessLogPage: async (input?: { viewer?: string }) => {
    const all: { viewer_user_id: string }[] = (await svc.getAccessLog()) ?? [];
    const rows = input?.viewer ? all.filter((r) => r.viewer_user_id === input.viewer) : all;
    return { rows, hasMore: false, nextBefore: null };
  },
  getCategories: () => svc.getCategories(),
  lookupPerson: jest.fn(),
  offerAccess: jest.fn(),
  extendGrant: jest.fn(),
  revokeGrant: jest.fn(),
  respondToRequest: jest.fn(),
}));
jest.mock("@/services/summit/goals.service", () => ({
  getMyGoals: () => Promise.resolve({ memberId: "m1", goals: [], coverage: [] }),
}));
jest.mock("@/components/manager/development/tabs/GoalsPanel", () => ({ CoachGoalCard: () => null }));
jest.mock("@/components/sharing/MemberLinkRequestCard", () => ({ MemberLinkRequestCard: () => null }));

import { SharingCore } from "@/pages/summit/SummitSharing";

const DETAILS = [
  { key: "goals", label: "Goals", enforced: "yes", note: "" },
  { key: "prism", label: "PRISM profile", enforced: "partial", note: "n" },
  { key: "assessments", label: "Assessments", enforced: "no", note: "" },
  { key: "artefacts", label: "Profile", enforced: "no", note: "" },
  { key: "interviews", label: "Interviews", enforced: "partial", note: "n" },
  { key: "development", label: "Development", enforced: "partial", note: "n" },
];

function p(i: number, over: Partial<VisibilityPerson> = {}): VisibilityPerson {
  return { userId: `u${i}`, displayName: `Person ${i}`, email: `p${i}@example.com`, kinds: ["manager_of_record"], grant: null, ...over };
}

function renderCore() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SharingCore />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  svc.getCategories.mockResolvedValue({ categories: [], details: DETAILS, notGrantable: ["safety"] });
  svc.getMyGrants.mockResolvedValue([]);
  svc.getAccessLog.mockResolvedValue([]);
});

describe("people as cards, three across", () => {
  it("lays the cards out in a three-column grid on wide screens, one pill each", async () => {
    svc.getPeople.mockResolvedValue({ people: [p(1), p(2), p(3), p(4)], sources: {} });
    renderCore();
    const grid = await screen.findByTestId("people-grid");
    expect(grid.className).toContain("lg:grid-cols-3");
    expect(within(grid).getAllByRole("button", { name: /^See access for/i })).toHaveLength(4);
  });

  it("shows no switches until See Access is clicked, then the controls and the status", async () => {
    svc.getPeople.mockResolvedValue({
      people: [p(1, { grant: { id: "g1", status: "granted", categories: { goals: true }, expiresAt: new Date(Date.now() + 9e8).toISOString() } as VisibilityPerson["grant"] })],
      sources: {},
    });
    renderCore();
    const pill = await screen.findByRole("button", { name: "See access for Person 1" });
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.getByTestId("card-status-u1")).toHaveTextContent("Sharing goals");
    fireEvent.click(pill);
    const tile = await screen.findByRole("dialog");
    expect(within(tile).getByRole("switch", { name: /share goals with person 1/i })).toBeChecked();
    expect(within(tile).getByRole("button", { name: "Preview Activity" })).toBeInTheDocument();
    expect(within(tile).getByRole("button", { name: /renew for a year/i })).toBeInTheDocument();
  });

  it("opens the tile of the person clicked, not another's", async () => {
    svc.getPeople.mockResolvedValue({ people: [p(1), p(2)], sources: {} });
    renderCore();
    fireEvent.click(await screen.findByRole("button", { name: "See access for Person 2" }));
    const tile = await screen.findByRole("dialog");
    expect(within(tile).getByRole("switch", { name: /share goals with person 2/i })).toBeInTheDocument();
    expect(within(tile).queryByRole("switch", { name: /share goals with person 1/i })).toBeNull();
  });
});

describe("Preview Activity lives in the tile", () => {
  it("is not a page section any more", async () => {
    svc.getPeople.mockResolvedValue({ people: [p(1)], sources: {} });
    renderCore();
    await screen.findByTestId("people-grid");
    expect(screen.queryByTestId("who-has-looked")).toBeNull();
    expect(screen.queryByText("Who has looked")).toBeNull();
  });

  it("shows only that person's reads once the pill is clicked", async () => {
    svc.getPeople.mockResolvedValue({ people: [p(1), p(2)], sources: {} });
    svc.getAccessLog.mockResolvedValue([
      { viewer_user_id: "u1", categories_viewed: ["goals"], surface: "growth:goals", viewed_at: "2026-09-04T14:00:00Z" },
      { viewer_user_id: "u2", categories_viewed: ["goals"], surface: "growth:goals", viewed_at: "2026-09-04T13:00:00Z" },
    ]);
    renderCore();
    fireEvent.click(await screen.findByRole("button", { name: "See access for Person 1" }));
    const tile = await screen.findByRole("dialog");
    fireEvent.click(within(tile).getByRole("button", { name: "Preview Activity" }));
    await waitFor(() => expect(within(tile).getByRole("list", { name: "Access log" })).toBeInTheDocument());
    const list = within(tile).getByRole("list", { name: "Access log" });
    expect(list).toHaveTextContent("Person 1");
    expect(list).not.toHaveTextContent("Person 2");
  });
});

describe("reads by people not listed: a tile like the others", () => {
  const ADMIN = "abcdef12-0000-4000-8000-000000000000";
  const LOG = [
    { viewer_user_id: "u1", categories_viewed: ["goals"], surface: "growth:goals", viewed_at: "2026-09-04T14:00:00Z" },
    { viewer_user_id: ADMIN, categories_viewed: ["goals"], surface: "growth:goals:super-admin", viewed_at: "2026-09-04T13:00:00Z" },
  ];

  it("is a card in the people grid with a Preview Activity pill, not a page section", async () => {
    svc.getPeople.mockResolvedValue({ people: [p(1)], sources: {} });
    svc.getAccessLog.mockResolvedValue(LOG);
    renderCore();
    const card = await screen.findByTestId("other-readers");
    expect(screen.getByTestId("people-grid")).toContainElement(card);
    expect(within(card).getByRole("button", { name: "Preview Activity" })).toBeInTheDocument();
    // The reads stay behind the pill until it is clicked.
    expect(screen.queryByRole("list", { name: "Access log" })).toBeNull();
  });

  it("opens a tile listing the unlisted readers and not the listed person's reads", async () => {
    svc.getPeople.mockResolvedValue({ people: [p(1)], sources: {} });
    svc.getAccessLog.mockResolvedValue(LOG);
    renderCore();
    const card = await screen.findByTestId("other-readers");
    fireEvent.click(within(card).getByRole("button", { name: "Preview Activity" }));
    const tile = await screen.findByTestId("other-readers-tile");
    const list = within(tile).getByRole("list", { name: "Access log" });
    expect(list).toHaveTextContent("Someone (abcdef12…)");
    expect(list).toHaveTextContent("platform admin");
    expect(list).not.toHaveTextContent("Person 1");
  });

  it("still shows when nobody is on the list", async () => {
    svc.getPeople.mockResolvedValue({ people: [], sources: {} });
    svc.getAccessLog.mockResolvedValue(LOG);
    renderCore();
    expect(await screen.findByTestId("other-readers")).toBeInTheDocument();
  });

  it("shows nothing when every reader is on the list", async () => {
    svc.getPeople.mockResolvedValue({ people: [p(1)], sources: {} });
    svc.getAccessLog.mockResolvedValue([LOG[0]]);
    renderCore();
    await screen.findByTestId("people-grid");
    await waitFor(() => expect(svc.getAccessLog).toHaveBeenCalled());
    expect(screen.queryByTestId("other-readers")).toBeNull();
  });
});

describe("the log says what was read, in words", () => {
  async function openOther(surfaces: string[]) {
    svc.getPeople.mockResolvedValue({ people: [p(1)], sources: {} });
    svc.getAccessLog.mockResolvedValue(
      surfaces.map((surface, i) => ({ viewer_user_id: "abcdef12-0000-4000-8000-000000000000", categories_viewed: ["goals"], surface, viewed_at: `2026-09-04T1${i}:00:00Z` })),
    );
    renderCore();
    const card = await screen.findByTestId("other-readers");
    fireEvent.click(within(card).getByRole("button", { name: "Preview Activity" }));
    const tile = await screen.findByTestId("other-readers-tile");
    return within(tile).getByRole("list", { name: "Access log" });
  }

  it("labels every growth read, a platform administrator's with the suffix, and shows no raw code", async () => {
    const list = await openOther([
      "growth:fit-matches:super-admin",
      "growth:gaps",
      "growth:learning-items",
      "growth:milestones",
      "growth:matches",
      "growth:member-prism",
      "growth:member-profile",
      "growth:share:super-admin",
    ]);
    expect(list).toHaveTextContent("read your Job Fit matches (platform admin)");
    expect(list).toHaveTextContent("read your gap analysis");
    expect(list).toHaveTextContent("read your learning items");
    expect(list).toHaveTextContent("read your milestones");
    expect(list).toHaveTextContent("read your development matches");
    expect(list).toHaveTextContent("read your PRISM profile");
    expect(list).toHaveTextContent("read your profile");
    expect(list).toHaveTextContent("read your shared goals (platform admin)");
    expect(list.textContent).not.toContain("growth:");
  });

  // Control: a code nobody has labelled is still shown, never hidden.
  it("still shows a code it has no label for", async () => {
    const list = await openOther(["growth:something-new"]);
    expect(list).toHaveTextContent("looked (growth:something-new)");
  });
});

describe("Add Access to a Person", () => {
  it("is titled that way and still takes an exact email only", async () => {
    svc.getPeople.mockResolvedValue({ people: [], sources: {} });
    renderCore();
    expect(await screen.findByText("Add Access to a Person")).toBeInTheDocument();
    expect(screen.queryByText("Add a person")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Email address" })).toHaveAttribute("type", "email");
  });
});
