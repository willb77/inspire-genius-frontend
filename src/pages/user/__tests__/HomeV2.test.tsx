import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock the layout + data hooks so HomeV2 renders in isolation.
jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Will Brown", email: "willb77@3pp.com" } }),
}));
jest.mock("@/hooks/documents/useLatestPrism", () => ({
  useLatestPrism: () => ({ data: null, isLoading: false, isError: false }),
}));

const mockEnabledVerticals = jest.fn(() => ({ data: ["lumen"] }));
jest.mock("@/verticals/core", () => ({
  useEnabledVerticals: () => mockEnabledVerticals(),
  // HomeV2 also renders QuickDirectionCard, which gates on entitlement before
  // it will even attempt its journey read. Default to "no access" here so these
  // tests keep exercising HomeV2 itself — the card's own states are covered in
  // QuickDirectionCard.test.tsx.
  useVerticalAccess: () => ({ hasAccess: false, isLoading: false }),
}));

// The regression: the backend returns a bare string[] of framework names.
// HomeV2 must NOT crash on `f.framework.toUpperCase()`.
jest.mock("@/hooks/profile/useProfile", () => ({
  useLoadedFrameworks: () => ({ data: ["PRISM", "DISC"] }),
  useMyProfile: () => ({ data: { personal_docs: ["resume"] } }),
  profileKeys: { me: () => ["profile", "me"] },
  usePreviewImportAssessment: () => ({ mutate: jest.fn(), reset: jest.fn(), isPending: false }),
  useConfirmImportAssessment: () => ({ mutate: jest.fn(), reset: jest.fn(), isPending: false }),
}));

// Defaults to "no data", exactly what the unmocked hook produced before, so
// every pre-existing test in this file is unaffected. The recent-topics tests
// below override it per-case.
const mockUseAgentConversation = jest.fn(() => ({
  data: undefined,
  isLoading: false,
}));
jest.mock("@/hooks/agents/useAgentConversation", () => ({
  useAgentConversation: () => mockUseAgentConversation(),
}));

import HomeV2 from "@/pages/user/HomeV2";

/** Build a conversation whose last activity was `daysAgo` days back. */
function convAt(id: string, title: string, daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  // Mid-day, so a test running near midnight cannot slide an entry into the
  // adjacent calendar day and make the assertions flap.
  d.setHours(12, 0, 0, 0);
  return { id, title, updated_at: d.toISOString() };
}

function wrap() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HomeV2 />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PERSONAL = "homev2-personal-info-dropdown";
const ASSESSMENTS = "homev2-other-assessments-dropdown";

beforeEach(() => {
  mockEnabledVerticals.mockReturnValue({ data: ["lumen"] });
  mockUseAgentConversation.mockReturnValue({ data: undefined, isLoading: false });
});

describe("HomeV2 — recent topics (5-day window)", () => {
  function withConversations(rows: ReturnType<typeof convAt>[]) {
    mockUseAgentConversation.mockReturnValue({
      data: { data: { conversations: rows } },
      isLoading: false,
    } as unknown as { data: undefined; isLoading: boolean });
    wrap();
    // Inline since 2026-08-06 — no trigger to click.
    return screen.getByTestId("homev2-last-actions");
  }

  it("includes conversations from inside the window", () => {
    const list = withConversations([
      convAt("a", "Today's thread", 0),
      convAt("b", "Four days back", 4),
    ]);
    expect(list).toHaveTextContent("Today's thread");
    expect(list).toHaveTextContent("Four days back");
  });

  it("excludes anything older than the window", () => {
    // The heading promises recent work; a six-day-old thread under it would
    // make the window meaningless.
    const list = withConversations([
      convAt("a", "Today's thread", 0),
      convAt("old", "Six days back", 6),
    ]);
    expect(list).toHaveTextContent("Today's thread");
    expect(list).not.toHaveTextContent("Six days back");
  });

  it("caps the list at four even when more fall inside the window", () => {
    // The cap is what keeps the tile a fixed height now that the topics render
    // inline rather than behind a dropdown.
    const list = withConversations([
      convAt("a", "One", 0),
      convAt("b", "Two", 1),
      convAt("c", "Three", 2),
      convAt("d", "Four", 3),
      convAt("e", "Five", 4),
    ]);
    expect(within(list).getAllByRole("button")).toHaveLength(4);
    expect(list).not.toHaveTextContent("Five");
  });

  it("shows the empty state when everything is outside the window", () => {
    // Not an empty list that reads as a failed fetch — the same rule the tile
    // already follows for a user with no history at all.
    mockUseAgentConversation.mockReturnValue({
      data: { data: { conversations: [convAt("old", "Ancient", 30)] } },
      isLoading: false,
    } as unknown as { data: undefined; isLoading: boolean });
    wrap();
    expect(screen.queryByTestId("homev2-last-actions")).toBeNull();
    expect(screen.getByText(/Nothing yet/i)).toBeInTheDocument();
  });

  it("drops rows with an unusable timestamp rather than widening the window", () => {
    const list = withConversations([
      convAt("a", "Today's thread", 0),
      { id: "bad", title: "No timestamp", updated_at: "" },
    ] as ReturnType<typeof convAt>[]);
    expect(list).toHaveTextContent("Today's thread");
    expect(list).not.toHaveTextContent("No timestamp");
  });
});

describe("HomeV2", () => {
  it("renders", () => {
    wrap();
    expect(
      screen.getByText(/Here's what you worked on last visit/i),
    ).toBeInTheDocument();
  });

  // "Other Assessments" (DISC/MBTI/Clifton/Hogan/Big Five) was removed from
  // Home on 2026-08-05. The loaded-frameworks read went with it — its only
  // consumer was that group's done-state.
  it("no longer renders the Other Assessments group", () => {
    wrap();
    expect(screen.queryByTestId(ASSESSMENTS)).toBeNull();
    expect(screen.queryByText("Other Assessments")).toBeNull();
  });

  it("marks Resume done from profile personal_docs (and Bio not done)", () => {
    // Mock has personal_docs: ["resume"].
    wrap();
    fireEvent.click(screen.getByTestId(PERSONAL));
    expect(
      screen.getByRole("button", { name: "Resume added" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Bio" })).toBeInTheDocument();
  });

  it("offers the PRISM report as the first Personal Info row", () => {
    wrap();
    fireEvent.click(screen.getByTestId(PERSONAL));
    // No latest-prism and no 'prism' personal_doc → still addable.
    expect(
      screen.getByRole("button", { name: "Add Prism Rpt .csv" }),
    ).toBeInTheDocument();
  });

  // ── PRISM Add+ must IMPORT, not just file the document ──────────────
  //
  // 2026-08-13: this button opened the generic tagged-upload modal. The CSV was
  // stored with doc_kind='prism', `latest-prism` fell through to it and
  // answered 200, so the tile ticked to done — while the user's
  // `assessment_scores` and `prism_results` stayed EMPTY. Five users reached
  // that state. The distinguishing signal is WHICH dialog opens: the tagged
  // upload files a document, the replace dialog parses scores server-side.
  describe("PRISM Add+ opens the score-importing dialog", () => {
    it("opens the PRISM replace dialog, not the tagged-upload modal", () => {
      wrap();
      fireEvent.click(screen.getByTestId(PERSONAL));
      fireEvent.click(screen.getByRole("button", { name: "Add Prism Rpt .csv" }));

      // The replace dialog — it posts to /v1/prism/report/me/replace.
      expect(screen.getByTestId("prism-replace-csv")).toBeInTheDocument();
      expect(screen.getByTestId("prism-replace-submit")).toBeInTheDocument();
      // ...and NOT the generic tagged-upload modal, whose heading is "Add <name>".
      expect(
        screen.queryByRole("heading", { name: "Add Prism Rpt .csv" }),
      ).toBeNull();
    });

    it("still uses the tagged-upload modal for Bio", () => {
      wrap();
      fireEvent.click(screen.getByTestId(PERSONAL));
      fireEvent.click(screen.getByRole("button", { name: "Add Bio" }));

      // Bio IS a document: the tagged-upload modal opens...
      expect(
        screen.getByRole("heading", { name: "Add Bio" }),
      ).toBeInTheDocument();
      // ...and it must NOT get the PRISM importer.
      expect(screen.queryByTestId("prism-replace-csv")).toBeNull();
    });
  });

  describe("layout", () => {
    // The Chat-with-Meridian CARD led the page until 2026-08-05. Asserting its
    // absence, and that the tile which sat second now leads.
    //
    // Guards the card, not the phrase: a "Chat with Meridian" BUTTON was added
    // to the behavioral row on 2026-08-05, so matching the bare string would
    // fail on that button while still not proving the card had gone. The card
    // is identified by what only it had — the ask box and Starter Questions.
    it("drops the Chat with Meridian tile", () => {
      wrap();
      expect(
        screen.queryByRole("button", { name: /Starter Questions/ }),
      ).toBeNull();
      expect(
        screen.queryByPlaceholderText(/Ask Meridian|What would you like/i),
      ).toBeNull();
      // The surviving match must be the row button, nothing card-shaped.
      expect(
        screen.getAllByText("Chat with Meridian").map((el) => el.closest("button")),
      ).toEqual([screen.getByTestId("homev2-chat-with-meridian")]);
    });

    // The Today's Prep tile (embedded Lumen Moments) was REMOVED on 2026-08-06.
    // Asserting its absence, and that Moments is not mounted from Home at all —
    // the tile's whole cost was mounting that surface on a page most visits use
    // for something else.
    it("no longer renders the Today's Prep tile", () => {
      wrap();
      expect(screen.queryByTestId("homev2-todays-prep")).toBeNull();
      expect(screen.queryByTestId("homev2-todays-prep-toggle")).toBeNull();
      expect(
        screen.queryByLabelText("Describe the situation"),
      ).not.toBeInTheDocument();
    });

    it("keeps Today's Prep reachable as a quick action", () => {
      // Removing the tile must not remove the destination.
      wrap();
      expect(screen.getByTestId("homev2-quick-moments")).toHaveAttribute(
        "href",
        "/vertical/lumen/moments",
      );
    });

    it("leads with the greeting, then the tile", () => {
      const { container } = wrap();
      const html = container.innerHTML;
      const header = html.indexOf('data-testid="homev2-header"');
      const lastVisit = html.indexOf("worked on last visit");
      expect(header).toBeGreaterThan(-1);
      expect(lastVisit).toBeGreaterThan(header);
    });

    it("drops the Watch-a-Video and Recent Activity tiles", () => {
      wrap();
      expect(screen.queryByText("Watch a Video")).toBeNull();
      expect(screen.queryByText(/Recent activity/i)).toBeNull();
    });

    it("keeps the videos reachable via the quick-action dropdown", () => {
      wrap();
      fireEvent.click(screen.getByTestId("homev2-quick-videos"));
      expect(screen.getByText("Brain-Map Quiz")).toBeInTheDocument();
    });
  });

  describe("quick-action entitlement", () => {
    it("links Today's Prep when lumen is entitled", () => {
      wrap();
      expect(screen.getByTestId("homev2-quick-moments")).toHaveAttribute(
        "href",
        "/vertical/lumen/moments",
      );
    });

    // Self-Portrait and My Journey were switched off on 2026-08-05. This is a
    // per-SHORTCUT lock, not a vertical-level one: Lumen and Direction Setting
    // are still live products, so the two must stay reachable elsewhere while
    // these Home pills are dark.
    // 2026-08-06: Self-Portrait was UN-locked, Goals added switched-off, and
    // My Journey / Job Fit removed from the row outright.
    it("links Self-Portrait now that it is switched back on", () => {
      mockEnabledVerticals.mockReturnValue({ data: ["lumen"] });
      wrap();
      expect(screen.getByTestId("homev2-quick-self-portrait")).toHaveAttribute(
        "href",
        "/vertical/lumen/self-portrait",
      );
    });

    // 2026-08-11: Goals UN-locked. LOCKED_QUICK_ACTIONS is now empty, so every
    // pill in the row is decided by entitlement alone.
    it("links Goals when Direction Setting is entitled", () => {
      mockEnabledVerticals.mockReturnValue({
        data: ["lumen", "direction-setting"],
      });
      wrap();
      const goals = screen.getByTestId("homev2-quick-goals");
      expect(goals).toHaveAttribute("href", "/vertical/direction-setting/goals");
      expect(goals).not.toHaveAttribute("aria-disabled", "true");
    });

    it("still locks Goals for a user NOT entitled to Direction Setting", () => {
      // Un-locking the pill must not bypass the entitlement gate underneath it.
      mockEnabledVerticals.mockReturnValue({ data: ["lumen"] });
      wrap();
      const goals = screen.getByTestId("homev2-quick-goals");
      expect(goals).toHaveAttribute("aria-disabled", "true");
      expect(goals).not.toHaveAttribute("href");
    });

    it("drops My Journey and Job Fit from the row entirely", () => {
      // Removed from QUICK_ACTIONS outright on 2026-08-06, not greyed. Job Fit
      // was switched back on at the vertical level on 2026-08-11 and reaches
      // users through the My Workspace menu; that did not restore this pill,
      // which was a separate decision about the Home row.
      mockEnabledVerticals.mockReturnValue({
        data: ["lumen", "job-fit", "direction-setting"],
      });
      wrap();
      expect(screen.queryByTestId("homev2-quick-my-journey")).toBeNull();
      expect(screen.queryByTestId("homev2-quick-job-fit")).toBeNull();
    });

    it("leaves the quick actions that were NOT switched off alone", () => {
      mockEnabledVerticals.mockReturnValue({
        data: ["lumen", "job-fit", "direction-setting"],
      });
      wrap();
      expect(screen.getByTestId("homev2-quick-moments")).toHaveAttribute("href");
      expect(screen.getByTestId("homev2-quick-self-portrait")).toHaveAttribute("href");
    });

    it("locks every action while entitlements are still loading", () => {
      // No `data` yet — the hook's default must not flash working links.
      mockEnabledVerticals.mockReturnValue({ data: undefined as never });
      wrap();
      for (const key of ["self-portrait", "moments", "goals"]) {
        expect(screen.getByTestId(`homev2-quick-${key}`)).toHaveAttribute(
          "aria-disabled",
          "true",
        );
      }
    });
  });
});

// ── 2026-08-03 layout changes ──────────────────────────────────────────────
describe("HomeV2 — 2026-08-03 changes", () => {
  it("no longer renders the completion gauge", () => {
    wrap();
    expect(screen.queryByText(/Complete profile/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("no longer renders the standalone Direction Setting card", () => {
    // The card rendered its own heading; My Journey replaced it. Entitlement is
    // granted here so a surviving card would actually render and fail this.
    mockEnabledVerticals.mockReturnValue({
      data: ["lumen", "job-fit", "direction-setting"],
    });
    wrap();
    expect(screen.queryByTestId("quick-direction-card")).not.toBeInTheDocument();
  });

  it("orders the row Self-Portrait → Today's Prep → Goals", () => {
    mockEnabledVerticals.mockReturnValue({
      data: ["lumen", "job-fit", "direction-setting"],
    });
    wrap();
    const row = screen.getByTestId("homev2-quick-actions");
    const keys = Array.from(
      row.querySelectorAll("[data-testid^='homev2-quick-']"),
    ).map((el) => el.getAttribute("data-testid"));
    expect(keys.indexOf("homev2-quick-self-portrait")).toBeLessThan(
      keys.indexOf("homev2-quick-moments"),
    );
    expect(keys.indexOf("homev2-quick-moments")).toBeLessThan(
      keys.indexOf("homev2-quick-goals"),
    );
  });
  describe("My Workspace guide pill", () => {
    it("sits in the header, beside the greeting", () => {
      wrap();
      const header = screen.getByTestId("homev2-header");
      const pill = screen.getByTestId("homev2-workspace-guide-video");
      expect(header).toContainElement(pill);
      expect(within(header).getByText(/What are we working on today\?/)).toBeInTheDocument();
    });

    it("points at the durable public URL and opens safely in a new tab", () => {
      wrap();
      const pill = screen.getByTestId("homev2-workspace-guide-video");
      // A durable S3 object URL. A presigned link would expire and leave a
      // dead pill on Home, which is the failure this asserts against.
      expect(pill).toHaveAttribute(
        "href",
        "https://ig-demo-public-videos.s3.amazonaws.com/My_Workspace_userguide.mp4",
      );
      expect(pill).toHaveAttribute("target", "_blank");
      // Both tokens matter: noopener stops the opened tab reaching
      // window.opener, and it is why this is an anchor rather than
      // window.open(..., "noopener"), which returns null and navigates the
      // CURRENT tab in some browsers.
      expect(pill.getAttribute("rel")).toContain("noopener");
      expect(pill.getAttribute("rel")).toContain("noreferrer");
    });

    it("renders regardless of PRISM or entitlements", () => {
      // The pill is universal — it explains the product to someone who has
      // neither a report nor any vertical switched on, which is precisely the
      // person who needs it.
      mockEnabledVerticals.mockReturnValue({ data: [] });
      wrap();
      expect(screen.getByTestId("homev2-workspace-guide-video")).toBeInTheDocument();
    });
  });
});
