/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";

/* ── Mocks ── */
const mockSidebarScaffold = jest.fn();
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: any) => {
    mockSidebarScaffold(props);
    return (
      <div data-testid="sidebar-scaffold" data-class={props.className}>
        {props.children}
        {props.renderAfterContent}
      </div>
    );
  },
}));

jest.mock("@/components/shared/AlexFloating", () => ({
  __esModule: true,
  default: () => <div data-testid="alex-floating" />,
}));

const mockUseTour = jest.fn().mockReturnValue({ isRunning: false });
jest.mock("@/context/useTour", () => ({
  useTour: () => mockUseTour(),
}));

const mockUseAuth = jest.fn().mockReturnValue({ user: { role: "user" } });
jest.mock("@/context/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/lib/agentApi", () => ({
  useAgentEngine: () => false,
}));

// My Workspace = the user menu with entitled workspace verticals (Job Fit,
// Lumen) spliced in. The splice has its own coverage in
// `components/layout/__tests__/useVerticalLauncher.test.ts`; default to identity
// here, and one test below overrides it to assert the layout passes them on.
const mockWorkspaceNav = jest.fn((items: unknown) => items);
// The consolidated Tools section; null by default so the baseline assertions
// (flat navItems, no navSections) hold — which since 2026-08-12 is also the
// real behaviour for a plain user, because useToolsSection is super-admin only.
type MockSection = {
  label: string;
  defaultCollapsed?: boolean;
  items: Array<{ to: string; label: string; disabled?: boolean }>;
} | null;
const mockLauncher = jest.fn((): MockSection => null);
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useWorkspaceNavItems: (items: unknown) => mockWorkspaceNav(items),
}));
jest.mock("@/hooks/nav/useToolsSection", () => ({
  useToolsSection: () => mockLauncher(),
}));

const DummyIcon = () => null;
const mockNavItems = [
  { to: "/home", icon: DummyIcon, label: "Home" },
  { to: "/dashboard", icon: DummyIcon, label: "Dashboard" },
];
jest.mock("@/constants/navigation", () => ({
  USER_NAV_ITEMS: [
    { to: "/home", icon: DummyIcon, label: "Home" },
    { to: "/dashboard", icon: DummyIcon, label: "Dashboard" },
  ],
  getUserNavItems: () => mockNavItems,
  SUPER_ADMIN_NAV_SECTIONS: [
    {
      label: "Administration",
      items: [{ to: "/super-admin/dashboard", icon: DummyIcon, label: "Dashboard" }],
    },
    {
      label: "Role Views",
      items: [{ to: "/home", icon: DummyIcon, label: "User Home" }],
    },
  ],
}));

jest.mock("@/constants/routes", () => ({
  ROUTES: { HOME: "/home", BIO_CAPTURE: "/bio" },
}));

jest.mock("lucide-react", () => ({
  Home: () => null,
  FileText: () => null,
  Settings: () => null,
  HelpCircle: () => null,
  Bot: () => null,
  LayoutDashboard: () => null,
  BookOpenText: () => null,
}));

import UserLayout from "../UserLayout";

describe("UserLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTour.mockReturnValue({ isRunning: false });
    mockUseAuth.mockReturnValue({ user: { role: "user" } });
    mockWorkspaceNav.mockImplementation((items: unknown) => items);
    mockLauncher.mockReturnValue(null);
  });

  test("renders children", () => {
    render(<UserLayout><div data-testid="child">Hello</div></UserLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("passes USER_NAV_ITEMS when user is regular user", () => {
    render(<UserLayout><div /></UserLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navItems).toHaveLength(2);
    expect(props.navItems[0].label).toBe("Home");
  });

  test("passes empty navItems + superAdmin sections when user is super-admin", () => {
    mockUseAuth.mockReturnValue({ user: { role: "super-admin" } });
    render(<UserLayout><div /></UserLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navItems).toEqual([]);
    expect(props.navSections).toBeDefined();
    // superAdminSections should include admin sections + user nav items section
    expect(props.navSections.length).toBeGreaterThanOrEqual(2);
  });

  test("does not render the retired AlexFloating assistant (monolith sunset)", () => {
    // AlexFloating was retired because its device-id call hit a deprecated
    // monolith route that 404s + fails CORS. UserLayout must no longer render it.
    render(<UserLayout><div /></UserLayout>);
    expect(screen.queryByTestId("alex-floating")).not.toBeInTheDocument();
  });

  test("forwards className", () => {
    render(<UserLayout className="custom"><div /></UserLayout>);
    expect(screen.getByTestId("sidebar-scaffold")).toHaveAttribute("data-class", "custom");
  });

  test("passes expandOnPath matching HOME route", () => {
    render(<UserLayout><div /></UserLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.expandOnPath).toBe("/home");
  });

  test("entitled workspace verticals (Job Fit, Lumen) appear in the user's flat menu", () => {
    mockWorkspaceNav.mockImplementation((items: unknown) => [
      ...(items as Array<{ to: string; label: string }>),
      { to: "/vertical/job-fit/matches", icon: DummyIcon, label: "Job Fit" },
      { to: "/vertical/lumen/dashboard", icon: DummyIcon, label: "Lumen" },
    ]);
    render(<UserLayout><div /></UserLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navItems.map((i: { label: string }) => i.label)).toEqual([
      "Home",
      "Dashboard",
      "Job Fit",
      "Lumen",
    ]);
  });

  test("gives a plain user NO Tools section — it is super-admin only", () => {
    // Until 2026-08-12 a plain user got a Tools rollup here carrying Bio
    // Capture and the whole vertical catalogue. The gate now lives in
    // useToolsSection, which returns null for the user role, so the layout must
    // fall back to the flat menu rather than rendering an empty group.
    render(<UserLayout><div /></UserLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections).toBeUndefined();
    expect(props.navItems.length).toBeGreaterThan(0);
  });

  test("renders the Tools section when the hook supplies one", () => {
    // Drives the layout's placement, not the gate: the hook is mocked, so this
    // asserts that whatever section it returns is rendered intact and expanded.
    mockLauncher.mockReturnValue({
      label: "Tools",
      defaultCollapsed: false,
      items: [
        { to: "/bio", label: "Bio Capture" },
        { to: "/vertical/grant/dashboard", label: "GRANT" },
        { to: "/vertical/honor/dashboard", label: "Honor Foundation", disabled: true },
      ],
    });
    render(<UserLayout><div /></UserLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections.map((s: { label: string }) => s.label)).toEqual(["", "Tools"]);
    const tools = props.navSections[1].items as Array<{ label: string; disabled?: boolean }>;
    expect(tools[0].label).toBe("Bio Capture");
    // Unentitled catalogue entries are listed, not hidden — greyed via `disabled`.
    expect(tools.find((i) => i.label === "Honor Foundation")?.disabled).toBe(true);
    expect(props.navSections[1].defaultCollapsed).toBe(false);
  });

  test("super-admin order is My Workspace → Role Views → Tools → Administration", () => {
    // Same order as SuperAdminLayout, so the menu does not reshuffle as a
    // super-admin moves between user pages and admin pages. "Verticals" became
    // "Tools" on 2026-08-12 when the two groups were consolidated.
    mockUseAuth.mockReturnValue({ user: { role: "super-admin" } });
    mockLauncher.mockReturnValue({
      label: "Tools",
      defaultCollapsed: false,
      items: [{ to: "/vertical/grant/dashboard", label: "GRANT" }],
    });
    render(<UserLayout><div /></UserLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections.map((s: { label: string }) => s.label)).toEqual([
      "My Workspace",
      "Role Views",
      "Tools",
      "Administration",
    ]);
  });

  test("forwards collapseSidebarOnMount to the scaffold", () => {
    render(<UserLayout collapseSidebarOnMount><div /></UserLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.collapseOnMount).toBe(true);
  });

  test("workspace verticals reach the super-admin 'My Workspace' section too", () => {
    mockUseAuth.mockReturnValue({ user: { role: "super-admin" } });
    mockWorkspaceNav.mockImplementation((items: unknown) => [
      ...(items as Array<{ to: string; label: string }>),
      { to: "/vertical/lumen/dashboard", icon: DummyIcon, label: "Lumen" },
    ]);
    render(<UserLayout><div /></UserLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    const workspace = props.navSections.find(
      (s: { label: string }) => s.label === "My Workspace",
    );
    expect(workspace.items.map((i: { label: string }) => i.label)).toContain("Lumen");
  });
});
