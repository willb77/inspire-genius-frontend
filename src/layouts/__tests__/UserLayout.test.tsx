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
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useWorkspaceNavItems: (items: unknown) => mockWorkspaceNav(items),
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
  ],
}));

jest.mock("@/constants/routes", () => ({
  ROUTES: { HOME: "/home" },
}));

jest.mock("lucide-react", () => ({
  Home: () => null,
  FileText: () => null,
  Settings: () => null,
  HelpCircle: () => null,
  Bot: () => null,
  LayoutDashboard: () => null,
}));

import UserLayout from "../UserLayout";

describe("UserLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTour.mockReturnValue({ isRunning: false });
    mockUseAuth.mockReturnValue({ user: { role: "user" } });
    mockWorkspaceNav.mockImplementation((items: unknown) => items);
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
