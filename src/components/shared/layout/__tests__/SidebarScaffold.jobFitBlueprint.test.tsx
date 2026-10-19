/**
 * @jest-environment jsdom
 *
 * The Career Fit sidebar section as each role sees it, rendered through the
 * real SidebarScaffold from the real `verticalSubNavItems` (2026-10-18):
 * "Blueprint a role" is greyed for `user` only.
 */

const mockNavigate = jest.fn();
jest.mock("@/lib/storage", () => ({
  setUIFlag: jest.fn(),
  getUIFlag: () => true,
  getUIFlagMap: () => ({}),
  setUIFlagMapEntry: jest.fn(),
}));
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/vertical/job-fit/matches" }),
}));
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ logout: jest.fn(), user: { id: "u1", role: "user" } }),
}));
jest.mock("@/hooks/useNotificationInbox", () => ({ useNotificationToasts: jest.fn() }));
jest.mock("@/components/shared/UserTopHeader", () => ({
  __esModule: true,
  default: () => <div data-testid="top-header" />,
}));
jest.mock("@/components/shared/VoiceDeskWidget", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/BroadcastAlertBanner", () => ({ BroadcastAlertBanner: () => null }));
jest.mock("@/components/shared/ConfirmDialog", () => ({
  __esModule: true,
  default: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

import { render, screen, fireEvent } from "@testing-library/react";
import SidebarScaffold from "../SidebarScaffold";
import {
  JOB_FIT_TOOLS,
  jobFitToolsForRole,
  verticalSubNavItems,
} from "@/constants/vertical-subnav";
import type { UserRole } from "@/types/roles";

const OTHER_ROLES: UserRole[] = ["manager", "company-admin", "practitioner", "distributor", "super-admin"];
const OTHER_TOOLS = ["My fit", "Gaps", "Pathway", "Fit a JD", "Coaching"];

function renderSidebarFor(role: UserRole) {
  const subNav = verticalSubNavItems("job-fit", role);
  if (!subNav) throw new Error("job-fit must have a sidebar menu");
  render(
    <SidebarScaffold navItems={[]} navSections={[{ label: "Career Fit", items: subNav.items }]}>
      <div />
    </SidebarScaffold>,
  );
}

describe("Career Fit sidebar — Blueprint a role by role", () => {
  beforeEach(() => jest.clearAllMocks());

  it("greys it for `user`: disabled, reason on hover, click does not navigate", () => {
    renderSidebarFor("user");
    const item = screen.getByRole("button", { name: "Blueprint a role" });
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toBeDisabled();
    expect(item).toHaveAttribute("title", "Not available for the User role");
    fireEvent.click(item);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("keeps every other Career Fit tool enabled for `user`", () => {
    renderSidebarFor("user");
    for (const label of OTHER_TOOLS) {
      const item = screen.getByRole("button", { name: label });
      expect(item).not.toHaveAttribute("aria-disabled");
      expect(item).not.toBeDisabled();
    }
  });

  it.each(OTHER_ROLES)("leaves it enabled and navigating for %s", (role) => {
    renderSidebarFor(role);
    const item = screen.getByRole("button", { name: "Blueprint a role" });
    expect(item).not.toHaveAttribute("aria-disabled");
    expect(item).not.toBeDisabled();
    fireEvent.click(item);
    expect(mockNavigate).toHaveBeenCalledWith("/vertical/job-fit/blueprint", undefined);
  });

  it("returns the untouched shared list for every non-user role", () => {
    for (const role of OTHER_ROLES) {
      expect(jobFitToolsForRole(role)).toBe(JOB_FIT_TOOLS);
    }
  });

  it("returns a stable array for `user` (the sidebar memoises on it)", () => {
    expect(jobFitToolsForRole("user")).toBe(jobFitToolsForRole("user"));
  });
});
