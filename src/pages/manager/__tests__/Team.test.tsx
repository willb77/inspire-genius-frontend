/**
 * @jest-environment jsdom
 */

/**
 * Team Roster (Client).
 *
 * ## What this file used to assert
 *
 * A test named "renders fallback team members in table" required that
 * "Alex Thompson" and "Maria Garcia" appear whenever the API returned nothing
 * — which was always, because `GET /api/manager/team` read a table no code has
 * ever written to. The suite was green, the page looked populated in every
 * environment, and the roster underneath was empty everywhere. The fabricated
 * data was the expectation, so removing it would have read as the regression.
 *
 * The assertions now run the other way: with no data the page must SAY it has
 * no data, and every rendered person must have come from the API.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ManagerTeam from "../Team";
import type { ManagerTeamMember } from "@/types/manager/team";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: any) => (
    <div data-testid={`data-card-${title}`}>{children}</div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

const mockRefetch = jest.fn();

jest.mock("@/hooks/manager/useManagerTeam", () => ({
  useManagerTeam: jest.fn(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

function member(over: Partial<ManagerTeamMember> = {}): ManagerTeamMember {
  return {
    id: "emp-1",
    user_id: "u-1",
    name: "Dana Okafor",
    email: "dana@edgecomb.test",
    role: "user",
    department: "Student Services",
    position: "Counselor",
    prism_color: "gold",
    training_completion: 0,
    last_active: null,
    ...over,
  };
}

function mockTeam(state: {
  members?: ManagerTeamMember[];
  isLoading?: boolean;
  error?: unknown;
}) {
  const { useManagerTeam } = require("@/hooks/manager/useManagerTeam");
  (useManagerTeam as jest.Mock).mockReturnValue({
    data: state.members
      ? {
          members: state.members,
          total: state.members.length,
          empty_reason: state.members.length ? null : "no_assignments",
        }
      : undefined,
    isLoading: state.isLoading ?? false,
    error: state.error ?? null,
    refetch: mockRefetch,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ManagerTeam />
    </MemoryRouter>,
  );
}

describe("ManagerTeam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTeam({ members: [] });
  });

  it("renders within ManagerLayout", () => {
    renderPage();
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  describe("with direct reports", () => {
    it("renders the people the API returned", () => {
      mockTeam({
        members: [
          member(),
          member({ id: "emp-2", user_id: "u-2", name: "Marco Reyes", email: "marco@edgecomb.test" }),
        ],
      });
      renderPage();

      expect(screen.getByText("Dana Okafor")).toBeInTheDocument();
      expect(screen.getByText("Marco Reyes")).toBeInTheDocument();
    });

    it("shows position and department from the employment record", () => {
      mockTeam({ members: [member()] });
      renderPage();

      expect(screen.getByText("Counselor")).toBeInTheDocument();
      expect(screen.getByText("Student Services")).toBeInTheDocument();
    });

    it("counts the rows rather than printing a fixed total", () => {
      mockTeam({ members: [member(), member({ id: "emp-2", user_id: "u-2", name: "Marco Reyes" })] });
      renderPage();

      expect(screen.getByText("Direct Reports")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("says 'Not assessed' rather than defaulting a PRISM colour", () => {
      // Every member rendering as Gold is indistinguishable from a real result.
      mockTeam({ members: [member({ prism_color: null })] });
      renderPage();

      expect(screen.getByText("Not assessed")).toBeInTheDocument();
    });

    it("links each member to their development workspace", () => {
      mockTeam({ members: [member()] });
      renderPage();

      expect(screen.getByRole("link", { name: /open profile/i })).toHaveAttribute(
        "href",
        "/manager/development/u-1",
      );
    });
  });

  describe("with nobody reporting to this manager", () => {
    it("says so instead of rendering invented people", () => {
      renderPage();
      expect(screen.getByText(/nobody reports to you yet/i)).toBeInTheDocument();
    });

    it("names the fix — a Manager column on the import", () => {
      renderPage();
      expect(screen.getByText(/Manager/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /team import/i })).toHaveAttribute(
        "href",
        "/manager/bulk-import",
      );
    });

    it("renders no data rows at all", () => {
      renderPage();
      expect(screen.queryByText("Alex Thompson")).not.toBeInTheDocument();
      expect(screen.queryByText("Maria Garcia")).not.toBeInTheDocument();
    });
  });

  it("shows skeletons when loading", () => {
    mockTeam({ members: undefined, isLoading: true });
    renderPage();
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows an error message and retry button on error", () => {
    // Distinct from the empty state on purpose: a failed load and an empty
    // roster must not read the same, which is the whole reason the backend
    // sends `empty_reason`.
    mockTeam({ members: undefined, error: new Error("fail") });
    renderPage();

    expect(screen.getByText(/failed to load your team/i)).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(screen.queryByText(/nobody reports to you yet/i)).not.toBeInTheDocument();
  });
});
