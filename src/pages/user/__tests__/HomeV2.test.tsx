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
  it("renders without crashing when loaded-frameworks is a string[]", () => {
    wrap();
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
  });

  it("marks a loaded framework (DISC) as done from the string list", () => {
    wrap();
    fireEvent.click(screen.getByTestId(ASSESSMENTS));
    // Done items expose their Add button as disabled with '<name> added'.
    expect(
      screen.getByRole("button", { name: "DISC added" }),
    ).toBeInTheDocument();
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

  it("drops Enneagram — it has no backend adapter and could never resolve done", () => {
    wrap();
    fireEvent.click(screen.getByTestId(ASSESSMENTS));
    expect(screen.queryByText("Enneagram")).toBeNull();
  });

  describe("layout", () => {
    it("puts Chat with Meridian above the Welcome back tile", () => {
      const { container } = wrap();
      const html = container.innerHTML;
      expect(html.indexOf("Chat with Meridian")).toBeLessThan(
        html.indexOf("Welcome back"),
      );
    });

    it("collapses Starter Questions by default", () => {
      wrap();
      const starters = screen.getByRole("button", { name: /Starter Questions/ });
      expect(starters).toHaveAttribute("aria-expanded", "false");
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
    it("links the Lumen actions when lumen is entitled", () => {
      wrap();
      expect(screen.getByTestId("homev2-quick-self-portrait")).toHaveAttribute(
        "href",
        "/vertical/lumen/self-portrait",
      );
      expect(screen.getByTestId("homev2-quick-moments")).toHaveAttribute(
        "href",
        "/vertical/lumen/moments",
      );
    });

    // Job Fit is NOT in the mocked entitlements — it must render locked rather
    // than as a link that the route guard would reject.
    it("locks Job Fit when job-fit is not entitled", () => {
      wrap();
      const jobFit = screen.getByTestId("homev2-quick-job-fit");
      expect(jobFit).toHaveAttribute("aria-disabled", "true");
      expect(jobFit).not.toHaveAttribute("href");
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
