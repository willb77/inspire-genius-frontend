import { render, screen, fireEvent } from "@testing-library/react";
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

import HomeV2 from "@/pages/user/HomeV2";

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

  describe("layout", () => {
    // The Chat-with-Meridian card led the page until 2026-08-05. Asserting its
    // absence, and that the tile which sat second now leads.
    it("drops the Chat with Meridian tile", () => {
      wrap();
      expect(screen.queryByText("Chat with Meridian")).toBeNull();
      expect(
        screen.queryByRole("button", { name: /Starter Questions/ }),
      ).toBeNull();
    });

    it("leads with the last-visit tile, above Today's Prep", () => {
      const { container } = wrap();
      const html = container.innerHTML;
      const lastVisit = html.indexOf("worked on last visit");
      // Anchor on the testid, not the rendered label: the apostrophe in
      // "Today's Prep" is HTML-escaped, so matching the text is a guess about
      // the entity encoding.
      const todaysPrep = html.indexOf('data-testid="homev2-todays-prep"');
      expect(lastVisit).toBeGreaterThan(-1);
      expect(todaysPrep).toBeGreaterThan(-1);
      expect(todaysPrep).toBeGreaterThan(lastVisit);
    });

    it("renders the Today's Prep tile with the Moments interface inside it", () => {
      wrap();
      const tile = screen.getByTestId("homev2-todays-prep");
      expect(tile).toBeInTheDocument();
      // Moments' own ask box, proving the embedded surface actually mounted
      // rather than just the tile chrome.
      expect(
        screen.getByLabelText("Describe the situation"),
      ).toBeInTheDocument();
    });

    it("does not repeat the Moments page heading inside the tile", () => {
      // `embedded` drops Moments' own <h1>; two stacked headings read as a bug.
      wrap();
      const headings = screen
        .getAllByRole("heading")
        .map((h) => h.textContent?.trim());
      expect(headings.filter((h) => h === "Moments")).toHaveLength(0);
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
    it.each([
      ["self-portrait", "homev2-quick-self-portrait"],
      ["my-journey", "homev2-quick-my-journey"],
    ])("locks %s even when its vertical is entitled", (_key, testId) => {
      mockEnabledVerticals.mockReturnValue({
        data: ["lumen", "direction-setting"],
      });
      wrap();
      const pill = screen.getByTestId(testId);
      expect(pill).toHaveAttribute("aria-disabled", "true");
      expect(pill).not.toHaveAttribute("href");
      // Their verticals ARE in the plan, so the entitlement wording would lie.
      expect(pill).toHaveAttribute("title", "Temporarily unavailable");
    });

    // Job Fit is NOT in the mocked entitlements — it must render locked rather
    // than as a link that the route guard would reject.
    it("locks Job Fit when job-fit is not entitled", () => {
      wrap();
      const jobFit = screen.getByTestId("homev2-quick-job-fit");
      expect(jobFit).toHaveAttribute("aria-disabled", "true");
      expect(jobFit).not.toHaveAttribute("href");
    });

    // Job Fit was switched off platform-wide on 2026-08-05. Home is one of the
    // three ways in (sidebar and the Meridian header row are the others), and
    // greying only the sidebar left this tile live — the feature looked off
    // while remaining one click away.
    it("locks Job Fit even when job-fit IS entitled", () => {
      mockEnabledVerticals.mockReturnValue({
        data: ["lumen", "job-fit", "direction-setting"],
      });
      wrap();
      const jobFit = screen.getByTestId("homev2-quick-job-fit");
      expect(jobFit).toHaveAttribute("aria-disabled", "true");
      expect(jobFit).not.toHaveAttribute("href");
      // Must NOT claim the plan lacks it — this user's plan includes it.
      expect(jobFit).toHaveAttribute("title", "Temporarily unavailable");
    });

    it("leaves the quick actions that were NOT switched off alone", () => {
      // The locks must be surgical: Today's Prep is the one pill still live,
      // and it has to survive its three neighbours being switched off.
      mockEnabledVerticals.mockReturnValue({
        data: ["lumen", "job-fit", "direction-setting"],
      });
      wrap();
      expect(screen.getByTestId("homev2-quick-moments")).toHaveAttribute("href");
    });

    it("locks every action while entitlements are still loading", () => {
      // No `data` yet — the hook's default must not flash working links.
      mockEnabledVerticals.mockReturnValue({ data: undefined as never });
      wrap();
      for (const key of ["self-portrait", "moments", "job-fit"]) {
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

  it("keeps My Journey between Today's Prep and Job Fit in the row", () => {
    mockEnabledVerticals.mockReturnValue({
      data: ["lumen", "job-fit", "direction-setting"],
    });
    wrap();

    // Position is still pinned even though the pill is now locked (2026-08-05)
    // — switching a shortcut off must not silently reshuffle the row.
    const row = screen.getByTestId("homev2-quick-actions");
    const keys = Array.from(
      row.querySelectorAll("[data-testid^='homev2-quick-']"),
    ).map((el) => el.getAttribute("data-testid"));
    expect(keys.indexOf("homev2-quick-my-journey")).toBeGreaterThan(
      keys.indexOf("homev2-quick-moments"),
    );
    expect(keys.indexOf("homev2-quick-my-journey")).toBeLessThan(
      keys.indexOf("homev2-quick-job-fit"),
    );
  });

  it("shows My Journey greyed when the vertical isn't entitled", () => {
    mockEnabledVerticals.mockReturnValue({ data: ["lumen"] });
    wrap();
    const journey = screen.getByTestId("homev2-quick-my-journey");
    expect(journey).toHaveAttribute("aria-disabled", "true");
    expect(journey).not.toHaveAttribute("href");
  });
});
