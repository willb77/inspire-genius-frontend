/**
 * HOME-1 — the shared "What we know about you" panel on Home, behind the
 * `home_about_you_panel` switch (CSA 2026-10-22-home-1, option 1).
 *
 * The existing HomeV2 suites run with the switch unmocked, which reads as off;
 * they are the "switch off = Home unchanged" check. This file covers the
 * switch itself and Home's own answers to the panel's three questions: which
 * PRISM path, what "has PRISM" means, and no journey call.
 */
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockSwitch = jest.fn(() => false);
jest.mock("@/hooks/switches/useHomeAboutYouPanelEnabled", () => ({
  useHomeAboutYouPanelEnabled: () => mockSwitch(),
}));

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Test Person" } }),
}));
const mockLatestPrism = jest.fn();
jest.mock("@/hooks/documents/useLatestPrism", () => ({
  useLatestPrism: () => mockLatestPrism(),
}));
jest.mock("@/verticals/core", () => ({
  useEnabledVerticals: () => ({ data: [] }),
  useVerticalAccess: () => ({ hasAccess: false, isLoading: false }),
}));
const mockMyProfile = jest.fn();
jest.mock("@/hooks/profile/useProfile", () => ({
  useLoadedFrameworks: () => ({ data: [] }),
  useMyProfile: () => mockMyProfile(),
  profileKeys: { me: () => ["profile", "me"] },
}));
jest.mock("@/hooks/agents/useAgentConversation", () => ({
  useAgentConversation: () => ({ data: undefined, isLoading: false }),
}));
jest.mock("@/hooks/prism/usePrismRequest", () => ({
  useLatestPrismStatus: () => ({ latest: null, isLoading: false, isError: false }),
}));
jest.mock("@/components/dashboard/v2/PrismDataMenu", () => ({
  PrismDataMenu: () => null,
}));

// The journey mutation must never be reached from Home.
const mockAdvanceMutate = jest.fn();
const mockUseAdvanceJourney = jest.fn(() => ({ mutate: mockAdvanceMutate }));
jest.mock("@/hooks/direction-setting/useJourney", () => ({
  useAdvanceJourney: () => mockUseAdvanceJourney(),
}));

// Stand-ins that say which upload path opened. Home has its own instance of
// the personal-doc modal too (for the Personal Info menu); only an open one
// renders anything.
jest.mock("@/components/dashboard/v2/AddPersonalDocModal", () => ({
  AddPersonalDocModal: ({
    target,
    onUploaded,
  }: {
    target: { name: string } | null;
    onUploaded?: () => void;
  }) =>
    target ? (
      <div>
        <span>personal modal open: {target.name}</span>
        <button type="button" onClick={() => onUploaded?.()}>
          simulate upload
        </button>
      </div>
    ) : null,
}));
jest.mock("@/components/prism/ReplacePrismDataButton", () => ({
  ReplacePrismDataDialog: ({ open }: { open: boolean }) =>
    open ? <div>replace dialog open</div> : null,
}));
const mockAssessmentModal = jest.fn();
jest.mock("@/components/dashboard/v2/AddAssessmentModal", () => ({
  AddAssessmentModal: (props: { target: unknown }) => {
    mockAssessmentModal(props);
    return props.target ? <div>assessment modal open</div> : null;
  },
}));

import HomeV2 from "@/pages/user/HomeV2";

const PANEL = "home-about-you-panel";

function prism({
  data = null as unknown,
  isError = false,
  status = undefined as number | undefined,
} = {}) {
  return {
    data,
    isLoading: false,
    isError,
    error: status === undefined ? null : { response: { status } },
    refetch: jest.fn(),
  };
}

function wrap() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HomeV2 />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSwitch.mockReturnValue(false);
  mockLatestPrism.mockReturnValue(prism());
  mockMyProfile.mockReturnValue({ data: { personal_docs: [] }, isError: false, refetch: jest.fn() });
});

describe("HomeV2 — HOME-1 switch", () => {
  it("off: no panel, and the header and tile are still there", () => {
    wrap();
    expect(screen.queryByTestId(PANEL)).toBeNull();
    expect(screen.queryByText("Upload résumé")).toBeNull();
    expect(screen.getByTestId("homev2-header")).toBeInTheDocument();
    expect(screen.getByTestId("homev2-request-prism-survey")).toBeInTheDocument();
    expect(screen.getByTestId("homev2-personal-info-dropdown")).toBeInTheDocument();
  });

  it("on, nothing on file: the four boxes, between the header and the tile", () => {
    mockSwitch.mockReturnValue(true);
    wrap();
    const panel = screen.getByTestId(PANEL);
    expect(within(panel).getAllByTestId("about-you-tile")).toHaveLength(4);
    for (const label of ["Request it", "Upload report", "Upload résumé", "Add bio"]) {
      expect(within(panel).getByRole("button", { name: label })).toBeEnabled();
    }
    expect(within(panel).getByText("Nothing on file yet — that's a fine place to start.")).toBeInTheDocument();

    const header = screen.getByTestId("homev2-header");
    const quick = screen.getByTestId("homev2-quick-actions");
    expect(header.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(panel.compareDocumentPosition(quick) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The header button and the Personal Info menu are unchanged (option 1).
    expect(screen.getByTestId("homev2-request-prism-survey")).toBeInTheDocument();
    expect(screen.getByTestId("homev2-personal-info-dropdown")).toBeInTheDocument();
  });

  it("on, PRISM + résumé + bio on file: one collapsed line, with a Show toggle", () => {
    mockSwitch.mockReturnValue(true);
    mockLatestPrism.mockReturnValue(prism({ data: { file_name: "prism.csv" } }));
    mockMyProfile.mockReturnValue({
      data: { personal_docs: ["resume", "bio"] },
      isError: false,
      refetch: jest.fn(),
    });
    wrap();
    const panel = screen.getByTestId(PANEL);
    expect(within(panel).getByTestId("about-you-collapsed")).toHaveTextContent(
      "PRISM, résumé and bio are on file.",
    );
    expect(within(panel).queryAllByTestId("about-you-tile")).toHaveLength(0);

    fireEvent.click(within(panel).getByRole("button", { name: "Show" }));
    expect(within(panel).getAllByTestId("about-you-tile")).toHaveLength(4);
    expect(within(panel).getByText(/3 of 3 on file: PRISM, résumé, bio/)).toBeInTheDocument();

    fireEvent.click(within(panel).getByRole("button", { name: "Hide" }));
    expect(within(panel).getByTestId("about-you-collapsed")).toBeInTheDocument();
  });

  it("does not collapse when only some are on file", () => {
    mockSwitch.mockReturnValue(true);
    mockLatestPrism.mockReturnValue(prism({ data: { file_name: "prism.csv" } }));
    mockMyProfile.mockReturnValue({ data: { personal_docs: ["resume"] }, isError: false, refetch: jest.fn() });
    wrap();
    const panel = screen.getByTestId(PANEL);
    expect(within(panel).queryByTestId("about-you-collapsed")).toBeNull();
    expect(within(panel).getByText(/2 of 3 on file: PRISM, résumé, bio/)).toBeInTheDocument();
  });

  it("'has PRISM' on Home is hasReport (latest-prism), not loaded-frameworks", () => {
    mockSwitch.mockReturnValue(true);
    mockLatestPrism.mockReturnValue(prism({ data: { file_name: "prism.csv" } }));
    wrap();
    const panel = screen.getByTestId(PANEL);
    expect(within(panel).getByText("Scores on file")).toBeInTheDocument();
    expect(within(panel).getByText("Results are in")).toBeInTheDocument();
  });

  it("a failed PRISM read is not a 'no': the box says it could not check", () => {
    mockSwitch.mockReturnValue(true);
    mockLatestPrism.mockReturnValue(prism({ isError: true, status: 500 }));
    wrap();
    const panel = screen.getByTestId(PANEL);
    expect(within(panel).getAllByText("Couldn't check just now")).toHaveLength(2);
    expect(within(panel).queryByText("Nothing uploaded yet")).toBeNull();
  });

  it("the Home PRISM box opens ReplacePrismDataDialog, never AddAssessmentModal", () => {
    mockSwitch.mockReturnValue(true);
    wrap();
    fireEvent.click(within(screen.getByTestId(PANEL)).getByRole("button", { name: "Upload report" }));
    expect(screen.getByText("replace dialog open")).toBeInTheDocument();
    expect(screen.queryByText("assessment modal open")).toBeNull();
    // Home never even mounts the import/confirm modal.
    expect(mockAssessmentModal).not.toHaveBeenCalled();
  });

  it("a résumé or bio upload on Home never calls the journey", () => {
    mockSwitch.mockReturnValue(true);
    wrap();
    const panel = screen.getByTestId(PANEL);
    fireEvent.click(within(panel).getByRole("button", { name: "Upload résumé" }));
    expect(screen.getByText(/personal modal open: Résumé/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "simulate upload" }));

    expect(mockUseAdvanceJourney).not.toHaveBeenCalled();
    expect(mockAdvanceMutate).not.toHaveBeenCalled();
  });

  it("uses no fixed colour class anywhere in the panel on Home", () => {
    mockSwitch.mockReturnValue(true);
    mockLatestPrism.mockReturnValue(prism({ data: { file_name: "prism.csv" } }));
    mockMyProfile.mockReturnValue({ data: { personal_docs: ["resume"] }, isError: false, refetch: jest.fn() });
    wrap();
    const panel = screen.getByTestId(PANEL);
    const classes = [panel, ...Array.from(panel.querySelectorAll("*"))].flatMap((el) =>
      (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean),
    );
    // A populated control: the scan has to see the tokens it is checking.
    expect(classes.filter((c) => /(^|:)(bg|text|border|ring)-ig-/.test(c)).length).toBeGreaterThan(10);
    const FIXED =
      /(^|:)(bg|text|border|ring|fill|stroke|outline|from|to|via|divide|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|muted|foreground|background|primary|secondary|card|accent|destructive|input|popover)(-|\/|$)/;
    expect(classes.filter((c) => FIXED.test(c))).toEqual([]);
  });
});
