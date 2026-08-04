import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Briefcase, UserRoundSearch } from "lucide-react";

import {
  WelcomeBackTile,
  type WelcomeBackAssessment,
  type WelcomeBackPersonalInfo,
  type WelcomeBackQuickAction,
} from "@/components/dashboard/v2/WelcomeBackTile";
import type { DashboardVideo } from "@/components/dashboard/v2/WatchVideoCard";

const VIDEOS: DashboardVideo[] = [
  { id: "a", title: "PRISM Survey — Introduction", src: "https://x/a.mp4" },
  { id: "b", title: "Brain-Map Quiz", src: "https://x/b.mp4" },
];

function renderTile(overrides?: {
  onResumeConversation?: () => void;
  onRequestAssessment?: () => void;
  onViewReportPdf?: () => void;
  onAddAssessment?: (name: string) => void;
  onAddPersonalInfo?: (name: string) => void;
  quickActions?: WelcomeBackQuickAction[];
  videos?: DashboardVideo[];
}) {
  const onResumeConversation = overrides?.onResumeConversation ?? jest.fn();
  const onRequestAssessment = overrides?.onRequestAssessment ?? jest.fn();
  const onViewReportPdf = overrides?.onViewReportPdf ?? jest.fn();
  const onAddAssessment = overrides?.onAddAssessment ?? jest.fn();
  const onAddPersonalInfo = overrides?.onAddPersonalInfo ?? jest.fn();

  const assessments: WelcomeBackAssessment[] = [
    { name: "DISC", done: true },
    { name: "Hogan", done: false },
  ];
  const personalInfo: WelcomeBackPersonalInfo[] = [
    { name: "Prism Rpt .csv", done: true },
    { name: "Resume", done: false },
    { name: "Bio", done: false },
  ];

  render(
    <MemoryRouter>
      <WelcomeBackTile
        displayName="willb77"
        onResumeConversation={onResumeConversation}
        hasReport
        reportFileName="X.csv"
        onRequestAssessment={onRequestAssessment}
        onViewReportPdf={onViewReportPdf}
        assessments={assessments}
        personalInfo={personalInfo}
        onAddAssessment={onAddAssessment}
        onAddPersonalInfo={onAddPersonalInfo}
        quickActions={overrides?.quickActions}
        videos={overrides?.videos}
      />
    </MemoryRouter>,
  );

  return {
    onResumeConversation,
    onRequestAssessment,
    onViewReportPdf,
    onAddAssessment,
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
  it("renders the welcome heading with the display name", () => {
    renderTile();
    expect(screen.getByText(/Welcome back,/)).toBeInTheDocument();
    expect(screen.getByText("willb77")).toBeInTheDocument();
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

  it("calls onRequestAssessment when the request button is clicked", () => {
    const { onRequestAssessment } = renderTile();
    fireEvent.click(
      screen.getByRole("button", { name: /Request PRISM Inventory/i }),
    );
    expect(onRequestAssessment).toHaveBeenCalledTimes(1);
  });

  it("calls onViewReportPdf when the view report button is clicked", () => {
    const { onViewReportPdf } = renderTile();
    fireEvent.click(screen.getByRole("button", { name: /View Inventory PDF/i }));
    expect(onViewReportPdf).toHaveBeenCalledTimes(1);
  });

  describe("completeness dropdowns", () => {
    it("renders both groups as dropdowns", () => {
      renderTile();
      expect(screen.getByText("Personal Info")).toBeInTheDocument();
      expect(screen.getByText("Other Assessments")).toBeInTheDocument();
    });

    it("starts collapsed — no Add rows are visible", () => {
      renderTile();
      expect(screen.queryByRole("button", { name: "Add Hogan" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Add Resume" })).toBeNull();
      expect(screen.getByTestId(ASSESSMENTS)).toHaveAttribute(
        "aria-expanded",
        "false",
      );
    });

    it("shows the done-count in the trigger so progress is legible while collapsed", () => {
      renderTile();
      // Personal Info: 1 of 3 done. Other Assessments: 1 of 2 done.
      expect(screen.getByText("1 of 3")).toBeInTheDocument();
      expect(screen.getByText("1 of 2")).toBeInTheDocument();
    });

    it("reveals its rows when opened", () => {
      renderTile();
      openDropdown(ASSESSMENTS);
      expect(
        screen.getByRole("button", { name: "Add Hogan" }),
      ).toBeInTheDocument();
    });

    it("calls onAddAssessment with the name for a not-done assessment", () => {
      const { onAddAssessment } = renderTile();
      openDropdown(ASSESSMENTS);
      fireEvent.click(screen.getByRole("button", { name: "Add Hogan" }));
      expect(onAddAssessment).toHaveBeenCalledWith("Hogan");
    });

    it("greys out (disables) the Add button for a done assessment", () => {
      const { onAddAssessment } = renderTile();
      openDropdown(ASSESSMENTS);
      const doneAdd = screen.getByRole("button", { name: "DISC added" });
      expect(doneAdd).toBeDisabled();
      fireEvent.click(doneAdd);
      expect(onAddAssessment).not.toHaveBeenCalled();
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

    it("omits the whole row when there are no actions and no videos", () => {
      renderTile();
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
