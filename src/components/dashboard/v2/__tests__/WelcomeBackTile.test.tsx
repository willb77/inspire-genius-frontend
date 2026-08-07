import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Briefcase, UserRoundSearch } from "lucide-react";

import {
  WelcomeBackTile,
  type WelcomeBackLastAction,
  type WelcomeBackPersonalInfo,
  type WelcomeBackQuickAction,
} from "@/components/dashboard/v2/WelcomeBackTile";
import type { DashboardVideo } from "@/components/dashboard/v2/WatchVideoCard";

const VIDEOS: DashboardVideo[] = [
  { id: "a", title: "PRISM Survey — Introduction", src: "https://x/a.mp4" },
  { id: "b", title: "Brain-Map Quiz", src: "https://x/b.mp4" },
];

const LAST_ACTIONS: WelcomeBackLastAction[] = [
  { id: "c1", label: "Preparing for my review", meta: "2 days ago" },
  { id: "c2", label: "Working through a team conflict", meta: "5 days ago" },
];

function renderTile(overrides?: {
  onResumeConversation?: (conversationId?: string) => void;
  onAddPersonalInfo?: (name: string) => void;
  quickActions?: WelcomeBackQuickAction[];
  videos?: DashboardVideo[];
  lastActions?: WelcomeBackLastAction[];
  lastActionsLoading?: boolean;
}) {
  const onResumeConversation = overrides?.onResumeConversation ?? jest.fn();
  const onAddPersonalInfo = overrides?.onAddPersonalInfo ?? jest.fn();

  const personalInfo: WelcomeBackPersonalInfo[] = [
    { name: "Prism Rpt .csv", done: true },
    { name: "Resume", done: false },
    { name: "Bio", done: false },
  ];

  render(
    <MemoryRouter>
      <WelcomeBackTile
        lastActions={overrides?.lastActions ?? LAST_ACTIONS}
        lastActionsLoading={overrides?.lastActionsLoading}
        onResumeConversation={onResumeConversation}
        hasReport
        reportFileName="X.csv"
        personalInfo={personalInfo}
        onAddPersonalInfo={onAddPersonalInfo}
        quickActions={overrides?.quickActions}
        videos={overrides?.videos}
      />
    </MemoryRouter>,
  );

  return {
    onResumeConversation,
    onAddPersonalInfo,
  };
}

/** Open a collapsed completeness dropdown by its testid. */
function openDropdown(testId: string): void {
  fireEvent.click(screen.getByTestId(testId));
}

const PERSONAL = "homev2-personal-info-dropdown";
const ASSESSMENTS = "homev2-other-assessments-dropdown";

describe("WelcomeBackTile", () => {
  // 2026-08-05: "Welcome back, {name}" was replaced by a last-visit summary.
  // Asserting the greeting's ABSENCE too — it is the sort of thing a merge
  // reinstates, and two headings would then stack.
  it("leads with what the user worked on last visit, not a greeting", () => {
    renderTile();
    expect(
      screen.getByText(/Here's what you worked on last visit/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Welcome back,/)).not.toBeInTheDocument();
  });

  // 2026-08-06: back to an inline list, capped at four by the host. The
  // dropdown existed to stop an uncapped list growing without bound; the cap
  // handles that, so the topics are visible without a click again.
  it("lists the recent topics inline, with no trigger to open", () => {
    renderTile();
    expect(screen.queryByTestId("homev2-last-actions-trigger")).toBeNull();
    const list = screen.getByTestId("homev2-last-actions");
    expect(list).toHaveTextContent("Preparing for my review");
    expect(list).toHaveTextContent("2 days ago");
    expect(list).toHaveTextContent("Working through a team conflict");
  });

  it("renders one row per topic, in the order given", () => {
    renderTile({
      lastActions: [
        { id: "a", label: "First", meta: "1 hour ago" },
        { id: "b", label: "Second", meta: "3 hours ago" },
        { id: "c", label: "Third", meta: "1 day ago" },
        { id: "d", label: "Fourth", meta: "2 days ago" },
      ],
    });
    const rows = within(screen.getByTestId("homev2-last-actions")).getAllByRole(
      "button",
    );
    expect(rows).toHaveLength(4);
    // Label and meta are adjacent spans, so textContent runs them together —
    // assert the parts, not a joined string.
    expect(rows.map((r) => r.querySelector("span")?.textContent)).toEqual([
      "First",
      "Second",
      "Third",
      "Fourth",
    ]);
    expect(rows[0]).toHaveTextContent("1 hour ago");
    expect(rows[3]).toHaveTextContent("2 days ago");
  });

  // The point of the deep link: picking a topic must resume THAT conversation,
  // not just open the chat.
  it("resumes the specific conversation that was clicked", () => {
    const { onResumeConversation } = renderTile();
    fireEvent.click(screen.getByTestId("homev2-last-action-c1"));
    expect(onResumeConversation).toHaveBeenCalledTimes(1);
    expect(onResumeConversation).toHaveBeenCalledWith("c1");
  });

  it("offers a way in when there is no history rather than an empty list", () => {
    // An empty list here is indistinguishable from a failed fetch; say so and
    // give the one useful next step.
    const { onResumeConversation } = renderTile({ lastActions: [] });
    expect(screen.queryByTestId("homev2-last-actions")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /start a conversation/i }),
    );
    expect(onResumeConversation).toHaveBeenCalledTimes(1);
  });

  it("says it is loading rather than showing 'nothing yet' mid-fetch", () => {
    renderTile({ lastActionsLoading: true, lastActions: [] });
    expect(screen.getByText(/Loading activity/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing yet/i)).not.toBeInTheDocument();
  });

  // The "View these videos…" line above the quick-action row was removed on
  // 2026-08-06. The Videos control itself stays — only the sentence went, so
  // assert both halves.
  it("drops the videos blurb but keeps the videos control", () => {
    renderTile({ videos: VIDEOS });
    expect(
      screen.queryByText(
        /View these videos on how to get the most from InspiresGenius/i,
      ),
    ).toBeNull();
    expect(screen.getByTestId("homev2-quick-videos")).toBeInTheDocument();
  });

  // The completion gauge was removed on 2026-08-03. Asserting its ABSENCE is
  // the point: a percentage silently reappearing is exactly the regression this
  // change is meant to prevent.
  it("does not render a profile completion gauge", () => {
    renderTile();
    expect(screen.queryByText(/Complete profile/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  // The "Your material" list was removed from this tile on request. The guard
  // stays: the section is the sort of thing that gets reinstated by a merge,
  // and it is meant to be gone, not merely absent from this render.
  it("does not list uploaded profile material", () => {
    renderTile();
    expect(
      screen.queryByTestId("homev2-profile-material"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Your material/i)).not.toBeInTheDocument();
  });

  it("renders the latest report file name", () => {
    renderTile();
    expect(screen.getByText(/Latest report:/)).toBeInTheDocument();
    expect(screen.getByText(/X\.csv/)).toBeInTheDocument();
  });

  // Request PRISM Survey / View PRISM Report / Chat with Meridian moved OUT of
  // this tile to the page header on 2026-08-06. Asserting their absence here is
  // the point: rendering them in both places would double the primary actions,
  // and that is exactly what a careless merge would reinstate. Their behaviour
  // is covered in HomeV2.test.tsx, which owns them now.
  it("no longer renders the primary action buttons — the header owns them", () => {
    renderTile();
    for (const name of [
      /Request PRISM Survey/i,
      /View PRISM Report/i,
      /Chat with Meridian/i,
    ]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  describe("completeness dropdowns", () => {
    // "Other Assessments" was removed from this tile on 2026-08-05 (request).
    // Personal Info is the only group left, and it now lives at the end of the
    // quick-action row rather than as a full-width block below it.
    it("renders Personal Info and NOT Other Assessments", () => {
      renderTile();
      expect(screen.getByText("Personal Info")).toBeInTheDocument();
      expect(screen.queryByText("Other Assessments")).not.toBeInTheDocument();
      expect(screen.queryByTestId(ASSESSMENTS)).toBeNull();
    });

    it("starts collapsed — no Add rows are visible", () => {
      renderTile();
      expect(screen.queryByRole("button", { name: "Add Resume" })).toBeNull();
      expect(screen.getByTestId(PERSONAL)).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("shows the done-count in the trigger so progress is legible while collapsed", () => {
      renderTile();
      // Personal Info: 1 of 3 done.
      expect(screen.getByText("1 of 3")).toBeInTheDocument();
    });

    it("reveals its rows when opened", () => {
      renderTile();
      openDropdown(PERSONAL);
      expect(
        screen.getByRole("button", { name: "Add Resume" }),
      ).toBeInTheDocument();
    });

    it("greys out (disables) the Add button for a done item", () => {
      const { onAddPersonalInfo } = renderTile();
      openDropdown(PERSONAL);
      const doneAdd = screen.getByRole("button", { name: "Prism Rpt .csv added" });
      expect(doneAdd).toBeDisabled();
      fireEvent.click(doneAdd);
      expect(onAddPersonalInfo).not.toHaveBeenCalled();
    });

    it("floats the panel rather than expanding the row", () => {
      // It sits inside the quick-action row now; an inline expansion would
      // shove that row's layout around every time it opened.
      renderTile();
      openDropdown(PERSONAL);
      expect(screen.getByTestId(`${PERSONAL}-panel`).className).toContain(
        "absolute",
      );
    });

    it("calls onAddPersonalInfo with the name for a personal-info item", () => {
      const { onAddPersonalInfo } = renderTile();
      openDropdown(PERSONAL);
      fireEvent.click(screen.getByRole("button", { name: "Add Resume" }));
      expect(onAddPersonalInfo).toHaveBeenCalledWith("Resume");
    });

    it("carries the PRISM report as a Personal Info row", () => {
      renderTile();
      openDropdown(PERSONAL);
      expect(
        screen.getByRole("button", { name: "Prism Rpt .csv added" }),
      ).toBeInTheDocument();
    });
  });

  describe("quick actions", () => {
    const ACTIONS: WelcomeBackQuickAction[] = [
      {
        key: "self-portrait",
        label: "Self-Portrait",
        to: "/vertical/lumen/self-portrait",
        entitled: true,
        icon: UserRoundSearch,
      },
      {
        key: "job-fit",
        label: "Job Fit",
        to: "/vertical/job-fit/matches",
        entitled: false,
        icon: Briefcase,
      },
    ];

    it("renders an entitled action as a real link to its route", () => {
      renderTile({ quickActions: ACTIONS });
      const link = screen.getByTestId("homev2-quick-self-portrait");
      expect(link).toHaveAttribute("href", "/vertical/lumen/self-portrait");
    });

    // Entitlement gates USE, not SIGHT: the unentitled action stays visible so
    // the capability is discoverable, but must not be a link that bounces off
    // the route guard.
    it("renders an unentitled action visible but locked and non-navigating", () => {
      renderTile({ quickActions: ACTIONS });
      const locked = screen.getByTestId("homev2-quick-job-fit");
      expect(locked).toBeInTheDocument();
      expect(locked).toHaveAttribute("aria-disabled", "true");
      expect(locked).not.toHaveAttribute("href");
    });

    // A locked action has two possible causes and they must not share wording:
    // no entitlement, or switched off for everyone. The default tooltip blames
    // the user's plan, which is false in the second case.
    it("uses the entitlement wording when no reason is supplied", () => {
      renderTile({ quickActions: ACTIONS });
      expect(screen.getByTestId("homev2-quick-job-fit")).toHaveAttribute(
        "title",
        expect.stringContaining("isn't enabled for your account"),
      );
    });

    it("prefers an explicit lockedReason over the entitlement wording", () => {
      renderTile({
        quickActions: [
          { ...ACTIONS[1], lockedReason: "Temporarily unavailable" },
        ],
      });
      const locked = screen.getByTestId("homev2-quick-job-fit");
      expect(locked).toHaveAttribute("title", "Temporarily unavailable");
      expect(locked).toHaveAttribute("aria-disabled", "true");
      expect(locked).not.toHaveAttribute("href");
    });

    // Personal Info moved INTO this row on 2026-08-05, so the row now survives
    // on Personal Info alone. Gating it on actions/videos only would silently
    // drop Personal Info for a user with neither.
    it("keeps the row for Personal Info even with no actions and no videos", () => {
      renderTile();
      expect(screen.getByTestId("homev2-quick-actions")).toBeInTheDocument();
      expect(screen.getByTestId(PERSONAL)).toBeInTheDocument();
    });

    it("omits the row entirely when there is nothing at all to put in it", () => {
      render(
        <MemoryRouter>
          <WelcomeBackTile
            lastActions={LAST_ACTIONS}
            onResumeConversation={jest.fn()}
            hasReport={false}
            personalInfo={[]}
          />
        </MemoryRouter>,
      );
      expect(screen.queryByTestId("homev2-quick-actions")).toBeNull();
    });
  });

  describe("videos dropdown", () => {
    it("lists the videos when opened", () => {
      renderTile({ videos: VIDEOS });
      fireEvent.click(screen.getByTestId("homev2-quick-videos"));
      expect(screen.getByText("Brain-Map Quiz")).toBeInTheDocument();
    });

    it("starts closed", () => {
      renderTile({ videos: VIDEOS });
      expect(screen.queryByText("Brain-Map Quiz")).toBeNull();
    });

    it("opens a player for the chosen video", () => {
      renderTile({ videos: VIDEOS });
      fireEvent.click(screen.getByTestId("homev2-quick-videos"));
      fireEvent.click(screen.getByText("Brain-Map Quiz"));
      expect(
        screen.getByRole("dialog", { name: /Brain-Map Quiz/ }),
      ).toBeInTheDocument();
    });
  });
});
