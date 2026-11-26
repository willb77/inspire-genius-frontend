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
  // RM-9b: one user list (getUserNavItems); the classic super-admin sections are gone.
  getUserNavItems: () => mockNavItems,
  // RM-2: the super-admin branch builds its menu in useSuperAdminSections,
  // which applies the owner-only filter. The real lists and the owner check are
  // covered in superAdminOneMenu.rm2.test.tsx; stubs are enough here.
  OWNER_ONLY_NAV_ROUTES: new Set<string>(),
  isPlatformOwner: () => false,
  // RM-8 (O-1): the house super-admin's pinned footer.
  SUPER_ADMIN_HOUSE_FOOTER_ITEMS: [
    { to: "/super-admin/settings", icon: DummyIcon, label: "Settings" },
    { to: "/help", icon: DummyIcon, label: "Help & Support" },
  ],
}));
jest.mock("@/constants/house/superAdminNav", () => ({
  HOUSE_SUPER_ADMIN_SECTIONS: [
    { label: "", items: [{ to: "/super-admin/dashboard", label: "Admin home" }] },
  ],
}));

jest.mock("@/constants/routes", () => ({
  ROUTES: {
    HOME: "/home",
    BIO_CAPTURE: "/bio",
    // RM-8 (O-1): read by useSuperAdminSections' house branch.
    SETTINGS: "/settings",
    HELP: "/help",
    SUPER_ADMIN: { SETTINGS: "/super-admin/settings" },
  },
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

// RM-1: manager, company-admin, practitioner and distributor render
// UnifiedLayout (their own menu). The real one is covered by
// UserLayout.toolsByRole.test.tsx; here a probe records what it was given.
const mockUnifiedLayout = jest.fn();
jest.mock("@/layouts/UnifiedLayout", () => ({
  __esModule: true,
  default: (props: { children?: React.ReactNode }) => {
    mockUnifiedLayout(props);
    return <div data-testid="unified-layout">{props.children}</div>;
  },
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

  test("passes the user list (getUserNavItems) when user is regular user", () => {
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
    // asserts that whatever section it returns is rendered intact, default included.
    mockLauncher.mockReturnValue({
      label: "Tools",
      defaultCollapsed: true,
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
    expect(props.navSections[1].defaultCollapsed).toBe(true);
  });

  test("super-admin order is the house menu: groups → Tools → My Workspace → footer (RM-9b: the only one)", () => {
    // Same order as SuperAdminLayout, so the menu does not reshuffle as a
    // super-admin moves between user pages and admin pages.
    mockUseAuth.mockReturnValue({ user: { role: "super-admin" } });
    mockLauncher.mockReturnValue({
      label: "Tools",
      defaultCollapsed: true,
      items: [{ to: "/vertical/grant/dashboard", label: "GRANT" }],
    });
    render(<UserLayout><div /></UserLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections.map((s: { label: string }) => s.label)).toEqual(["", "Tools", "My Workspace", ""]);
  });

  test("super-admin: My Workspace stays open on user pages (RM-2), whatever house_style_admin says", () => {
    localStorage.setItem("house_style_admin", "false");
    try {
      mockUseAuth.mockReturnValue({ user: { role: "super-admin" } });
      render(<UserLayout collapseSidebarOnMount className="custom"><div /></UserLayout>);
      const props = mockSidebarScaffold.mock.calls[0][0];
      expect(props.navItems).toEqual([]);
      expect(props.expandOnPath).toBe("/home");
      expect(props.collapseOnMount).toBe(true);
      expect(props.className).toBe("custom");
      const labels = props.navSections.map((s: { label: string }) => s.label);
      expect(labels).not.toContain("Role Views");
      const workspace = props.navSections.find(
        (s: { label: string }) => s.label === "My Workspace",
      );
      expect(workspace.defaultCollapsed).toBeUndefined();
      expect(workspace.collapsible).toBeUndefined();
    } finally {
      localStorage.removeItem("house_style_admin");
    }
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

  describe("RM-1 — the signed-in role's own chrome", () => {
    test.each(["manager", "company-admin", "practitioner", "distributor"])(
      "%s renders UnifiedLayout with its own role and the same props",
      (role) => {
        mockUseAuth.mockReturnValue({ user: { role } });
        render(
          <UserLayout className="custom" collapseSidebarOnMount>
            <div data-testid="child" />
          </UserLayout>,
        );
        expect(mockUnifiedLayout).toHaveBeenCalledTimes(1);
        const props = mockUnifiedLayout.mock.calls[0][0];
        expect(props.role).toBe(role);
        expect(props.className).toBe("custom");
        expect(props.collapseSidebarOnMount).toBe(true);
        expect(screen.getByTestId("child")).toBeInTheDocument();
        // The user chrome is not rendered underneath it.
        expect(mockSidebarScaffold).not.toHaveBeenCalled();
      },
    );

    test.each(["user", "super-admin", "manager-admin", undefined])(
      "%s keeps the user-page chrome",
      (role) => {
        mockUseAuth.mockReturnValue({ user: role === undefined ? null : { role } });
        render(<UserLayout><div /></UserLayout>);
        expect(mockUnifiedLayout).not.toHaveBeenCalled();
        expect(mockSidebarScaffold).toHaveBeenCalledTimes(1);
      },
    );

    test("a role change on the same mounted tree swaps chrome without a hook-order error", () => {
      mockUseAuth.mockReturnValue({ user: { role: "user" } });
      const { rerender } = render(<UserLayout><div /></UserLayout>);
      mockUseAuth.mockReturnValue({ user: { role: "manager" } });
      rerender(<UserLayout><div /></UserLayout>);
      mockUseAuth.mockReturnValue({ user: { role: "super-admin" } });
      rerender(<UserLayout><div /></UserLayout>);
      expect(mockUnifiedLayout).toHaveBeenCalledTimes(1);
      expect(mockSidebarScaffold).toHaveBeenCalledTimes(2);
    });
  });
});
