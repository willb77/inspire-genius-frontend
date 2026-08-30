/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import SuperAdminLayout from "../SuperAdminLayout";

// 🔹 Mock lucide-react icons
jest.mock("lucide-react", () => ({
  LayoutDashboard: () => <span data-testid="icon-dashboard" />,
  UsersRound: () => <span data-testid="icon-users" />,
  Bot: () => <span data-testid="icon-bot" />,
  Settings: () => <span data-testid="icon-settings" />,
  MessageSquarePlus: () => <span data-testid="icon-rlhf" />,
  Wand2: () => <span data-testid="icon-prompt" />,
  Shield: () => <span data-testid="icon-audit" />,
  FileText: () => <span data-testid="icon-file" />,
  BarChart3: () => <span data-testid="icon-analytics" />,
  Home: () => <span data-testid="icon-home" />,
  Users: () => <span data-testid="icon-team" />,
  Building2: () => <span data-testid="icon-building" />,
  UserCheck: () => <span data-testid="icon-usercheck" />,
  Briefcase: () => <span data-testid="icon-briefcase" />,
  // GRANT section + toggle icons
  GraduationCap: () => <span data-testid="icon-grad" />,
  Wallet: () => <span data-testid="icon-wallet" />,
  Landmark: () => <span data-testid="icon-landmark" />,
  Award: () => <span data-testid="icon-award" />,
  ClipboardList: () => <span data-testid="icon-clipboard" />,
  Scale: () => <span data-testid="icon-scale" />,
  Banknote: () => <span data-testid="icon-banknote" />,
  Target: () => <span data-testid="icon-target" />,
}));

// 🔹 Mock the entitlement hook (avoids React Query / QueryClient in this test)
const mockUseVerticalAccess = jest.fn((vertical: string) => {
  void vertical; // arg-aware signature so mockImplementation((v) => …) typechecks
  return {
    hasAccess: false,
    isLoading: false,
    enabledVerticals: [] as string[],
  };
});
jest.mock("@/verticals/core", () => ({
  useVerticalAccess: (vertical: string) => mockUseVerticalAccess(vertical),
}));

// 🔹 Mock the registry-driven vertical launcher (Honor + future verticals surface
// through it now, not a hardcoded section). Structural type — SuperAdminLayout
// only reads .label/.items and hands items to the (mocked) SidebarScaffold.
type MockLauncher =
  | {
      label: string;
      defaultCollapsed?: boolean;
      items: { to: string; icon: () => null; label: string; disabled?: boolean }[];
    }
  | null;
const mockLauncher = jest.fn((): MockLauncher => null);
// `useWorkspaceNavItems` splices entitled workspace verticals (Job Fit, Lumen)
// into My Workspace; it has its own coverage in
// `components/layout/__tests__/useVerticalLauncher.test.ts`. One test below
// overrides this identity default to assert the layout passes them through.
const mockWorkspaceNav = jest.fn((items: unknown) => items);
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useWorkspaceNavItems: (items: unknown) => mockWorkspaceNav(items),
}));

// The layout no longer assembles the Tools section — it places the one built by
// `useToolsSection`, whose own suite covers the merge, the role gate and the
// dedupe. `mockLauncher` here therefore stands in for that finished section.
jest.mock("@/hooks/nav/useToolsSection", () => ({
  useToolsSection: () => mockLauncher(),
}));

// `entitleOnly` was removed with the bespoke GRANT section: the layout no
// longer calls `useVerticalAccess` at all — entitlement now reaches it already
// resolved, as the `disabled` flag on each launcher item.

// 🔹 Stub the preview toggle (its own deps are tested separately)
jest.mock("@/components/grant/GrantPreviewToggle", () => ({
  __esModule: true,
  default: () => <div data-testid="grant-preview-toggle" />,
}));

// 🔹 Mock navigation with sections the layout uses
jest.mock("@/constants/navigation", () => {
  const DummyIcon = () => null;
  return {
    SUPER_ADMIN_NAV_SECTIONS: [
      {
        label: "Administration",
        items: [
          { to: "/super-admin/dashboard", icon: DummyIcon, label: "Dashboard" },
          { to: "/super-admin/users", icon: DummyIcon, label: "User Management" },
          { to: "/super-admin/coaches", icon: DummyIcon, label: "Coach Management" },
          { to: "/super-admin/rlhf-training", icon: DummyIcon, label: "RLHF Training" },
          { to: "/super-admin/prompt-builder", icon: DummyIcon, label: "Prompt Builder" },
          { to: "/super-admin/audit-log", icon: DummyIcon, label: "Audit Log" },
          { to: "/super-admin/analytics", icon: DummyIcon, label: "Analytics" },
          { to: "/super-admin/settings", icon: DummyIcon, label: "Settings" },
          { to: "/super-admin/project-log", icon: DummyIcon, label: "Project Log" },
          // Owner-only item — filtered out for non-owner super-admins.
          { to: "/super-admin/dev-traffic-report", icon: DummyIcon, label: "Dev Traffic Report" },
        ],
        defaultCollapsed: true,
      },
      {
        label: "Role Views",
        items: [
          { to: "/home", icon: DummyIcon, label: "User Home" },
          { to: "/manager/dashboard", icon: DummyIcon, label: "Manager" },
          { to: "/company-admin/dashboard", icon: DummyIcon, label: "Company Admin" },
          { to: "/practitioner/dashboard", icon: DummyIcon, label: "Practitioner" },
          { to: "/distributor/dashboard", icon: DummyIcon, label: "Distributor" },
        ],
        defaultCollapsed: true,
      },
    ],
    getUserNavItems: () => [
      { to: "/home", icon: DummyIcon, label: "Home" },
      { to: "/meridian/chat", icon: DummyIcon, label: "Chat with Meridian" },
      { to: "/prism-assessment", icon: DummyIcon, label: "Request Assessment" },
      { to: "/documents", icon: DummyIcon, label: "My Documents" },
      { to: "/feedback", icon: DummyIcon, label: "Feedback" },
      { to: "/analytics", icon: DummyIcon, label: "Analytics" },
      { to: "/onboarding/wizard", icon: DummyIcon, label: "Onboarding Wizard" },
      { to: "/settings", icon: DummyIcon, label: "Settings" },
      { to: "/help", icon: DummyIcon, label: "Help & Support" },
    ],
    OWNER_ONLY_NAV_ROUTES: new Set<string>(["/super-admin/dev-traffic-report"]),
    isPlatformOwner: (email: string | null | undefined) =>
      (email ?? "").trim().toLowerCase() === "willb77@3pp.com",
  };
});

// 🔹 Mock the agent-engine toggle hook used by the layout
jest.mock("@/lib/agentApi", () => ({
  useAgentEngine: () => true,
}));

// 🔹 Mock auth — default to a NON-owner super-admin so the baseline
// (dev-traffic-report filtered out) assertions hold; owner tests flip mockEmail.
let mockEmail: string | null = "admin@example.com";
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: mockEmail ? { email: mockEmail } : null }),
}));

// 🔹 Capture props passed to SidebarScaffold
type MockNavItem = { to: string; label: string; disabled?: boolean };
type MockNavSection = { label: string; items: MockNavItem[]; defaultCollapsed?: boolean };
type MockScaffoldProps = {
  navSections?: MockNavSection[];
  className?: string;
  children?: ReactNode;
  renderAfterContent?: ReactNode;
};
const mockSidebarScaffold = jest.fn();

jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: MockScaffoldProps) => {
    mockSidebarScaffold(props);
    return (
      <div data-testid="sidebar-scaffold" data-class={props.className}>
        {/* Render section labels and nav labels for testing */}
        {props.navSections?.map((section) => (
          <div key={section.label}>
            <div data-testid={`section-${section.label}`}>{section.label}</div>
            {section.items.map((item) => (
              <div key={item.label}>{item.label}</div>
            ))}
          </div>
        ))}
        {props.children}
        {props.renderAfterContent}
      </div>
    );
  },
}));

describe("SuperAdminLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVerticalAccess.mockReturnValue({
      hasAccess: false,
      isLoading: false,
      enabledVerticals: [],
    });
    mockLauncher.mockReturnValue(null); // no Tools section unless a test sets one
    mockWorkspaceNav.mockImplementation((items: unknown) => items); // no workspace vertical
    mockEmail = "admin@example.com"; // non-owner by default
  });

  test("renders children correctly", () => {
    render(
      <SuperAdminLayout>
        <div data-testid="child">Test Content</div>
      </SuperAdminLayout>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("passes navSections to SidebarScaffold", () => {
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    expect(mockSidebarScaffold).toHaveBeenCalled();

    const props = mockSidebarScaffold.mock.calls[0][0];

    // Order since 2026-07-28: My Workspace → Role Views → [Verticals] →
    // Administration. Verticals is absent here only because `mockLauncher`
    // defaults to null in this test's beforeEach.
    expect(props.navSections).toHaveLength(3);
    expect(props.navSections[0].label).toBe("My Workspace");
    expect(props.navSections[0].defaultCollapsed).toBe(true);
    expect(props.navSections[1].label).toBe("Role Views");
    expect(props.navSections[1].items).toHaveLength(5);
    expect(props.navSections[1].defaultCollapsed).toBe(true);
    expect(props.navSections[2].label).toBe("Administration");
    // 10 mock items minus the owner-only Dev Traffic Report (non-owner default) = 9.
    expect(props.navSections[2].items).toHaveLength(9);
    // Administration is expanded on super-admin pages (the user is mid-task)
    expect(props.navSections[2].defaultCollapsed).toBe(false);
  });

  test("renders administration and role view labels", () => {
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Prompt Builder")).toBeInTheDocument();
    expect(screen.getByText("User Home")).toBeInTheDocument();
    expect(screen.getByText("Manager")).toBeInTheDocument();
    expect(screen.getByText("Company Admin")).toBeInTheDocument();
    expect(screen.getByText("Practitioner")).toBeInTheDocument();
    expect(screen.getByText("Distributor")).toBeInTheDocument();
    // "My Workspace" surfaces the user nav so super-admin can hop back
    expect(screen.getByText("My Workspace")).toBeInTheDocument();
    expect(screen.getByText("Chat with Meridian")).toBeInTheDocument();
  });

  test("Financial Aid is an entry INSIDE the Tools catalogue, not its own section", () => {
    // GRANT lost its bespoke top-level section on 2026-07-28: it is one entry in
    // the registry-driven catalogue (the launcher section, labelled "Tools"
    // since 2026-07-31), its nine aid pages reached through VerticalShell once
    // you enter.
    mockLauncher.mockReturnValue({
      label: "Tools",
      items: [
        { to: "/vertical/grant/dashboard", icon: () => null, label: "Financial Aid" },
        { to: "/vertical/honor/dashboard", icon: () => null, label: "Honor Foundation" },
      ],
    });
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections.some((s: MockNavSection) => s.label === "Financial Aid")).toBe(false);
    const tools = props.navSections.find((s: MockNavSection) => s.label === "Tools");
    expect(tools.items.map((i: MockNavItem) => i.label)).toEqual([
      "Financial Aid",
      "Honor Foundation",
    ]);
    // the preview toggle is still passed through renderAfterContent
    expect(screen.getByTestId("grant-preview-toggle")).toBeInTheDocument();
  });

  test("Tools sits after Role Views and before Administration", () => {
    mockLauncher.mockReturnValue({
      label: "Tools",
      items: [{ to: "/vertical/honor/dashboard", icon: () => null, label: "Honor Foundation" }],
    });
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections.map((s: MockNavSection) => s.label)).toEqual([
      "My Workspace",
      "Role Views",
      "Tools",
      "Administration",
    ]);
    expect(props.navSections[2].items[0].label).toBe("Honor Foundation");
  });

  test("unentitled verticals are listed greyed, not omitted", () => {
    mockLauncher.mockReturnValue({
      label: "Tools",
      items: [
        { to: "/vertical/grant/dashboard", icon: () => null, label: "Financial Aid", disabled: true },
      ],
    });
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    const tools = props.navSections.find((s: MockNavSection) => s.label === "Tools");
    expect(tools.items).toHaveLength(1);
    expect(tools.items[0].disabled).toBe(true);
  });

  test("renders exactly ONE 'Tools' section, expanded, in hook order", () => {
    // The merge itself moved into useToolsSection (2026-08-12) and is covered
    // there. What this layout still owns is placing that ONE section: two
    // same-labelled sections collided on SidebarScaffold's key={section.label},
    // which is what made a Tools group appear only when Administration was
    // toggled. Count, not lookup, is the assertion that catches a regression.
    mockLauncher.mockReturnValue({
      label: "Tools",
      defaultCollapsed: false,
      items: [
        { to: "/bio", icon: () => null, label: "Bio Capture" },
        { to: "/manager/development", icon: () => null, label: "Team Development Studio" },
        { to: "/super-admin/interview-live", icon: () => null, label: "Live Interview" },
        { to: "/vertical/lumen/dashboard", icon: () => null, label: "Lumen" },
      ],
    });
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    const props = mockSidebarScaffold.mock.calls[0][0];
    const toolsSections = props.navSections.filter((s: MockNavSection) => s.label === "Tools");
    expect(toolsSections).toHaveLength(1);
    expect(toolsSections[0].items.map((i: MockNavItem) => i.label)).toEqual([
      "Bio Capture",
      "Team Development Studio",
      "Live Interview",
      "Lumen",
    ]);
    // Expanded — a super-admin must see and click the tools without first
    // expanding anything, and without touching Administration.
    expect(toolsSections[0].defaultCollapsed).toBe(false);
    expect(screen.getByText("Team Development Studio")).toBeInTheDocument();
    expect(screen.getByText("Live Interview")).toBeInTheDocument();
  });

  test("omits the Tools section entirely when the hook returns null", () => {
    mockLauncher.mockReturnValue(null);
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections.some((s: MockNavSection) => s.label === "Tools")).toBe(false);
  });

  test("hides the owner-only Dev Traffic Report item from non-owner super-admins", () => {
    mockEmail = "admin@example.com";
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    const props = mockSidebarScaffold.mock.calls[0][0];
    const admin = props.navSections.find((s: MockNavSection) => s.label === "Administration");
    expect(admin.items).toHaveLength(9);
    expect(admin.items.some((i: MockNavItem) => i.label === "Dev Traffic Report")).toBe(false);
    expect(screen.queryByText("Dev Traffic Report")).not.toBeInTheDocument();
  });

  test("keeps the Dev Traffic Report item on Administration for the platform owner", () => {
    mockEmail = "willb77@3pp.com";
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    const props = mockSidebarScaffold.mock.calls[0][0];
    const admin = props.navSections.find((s: MockNavSection) => s.label === "Administration");
    expect(admin.items).toHaveLength(10);
    expect(admin.items.some((i: MockNavItem) => i.label === "Dev Traffic Report")).toBe(true);
    expect(screen.getByText("Dev Traffic Report")).toBeInTheDocument();
  });

  test("owner check is case-insensitive", () => {
    mockEmail = "WillB77@3PP.com";
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    const props = mockSidebarScaffold.mock.calls[0][0];
    const admin = props.navSections.find((s: MockNavSection) => s.label === "Administration");
    expect(admin.items.some((i: MockNavItem) => i.label === "Dev Traffic Report")).toBe(true);
  });

  test("forwards className to SidebarScaffold", () => {
    render(
      <SuperAdminLayout className="custom-class">
        <div />
      </SuperAdminLayout>,
    );

    expect(screen.getByTestId("sidebar-scaffold")).toHaveAttribute(
      "data-class",
      "custom-class",
    );
  });

  test("workspace verticals (Job Fit, Lumen) land in My Workspace, not Verticals", () => {
    mockWorkspaceNav.mockImplementation((items: unknown) => [
      ...(items as MockNavItem[]),
      { to: "/vertical/job-fit/matches", label: "Job Fit" },
      { to: "/vertical/lumen/dashboard", label: "Lumen" },
    ]);
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    const props = mockSidebarScaffold.mock.calls[0][0];
    const workspace = props.navSections.find((s: MockNavSection) => s.label === "My Workspace");
    expect(workspace.items.map((i: MockNavItem) => i.label)).toEqual(
      expect.arrayContaining(["Job Fit", "Lumen"]),
    );
    // No launcher section was produced, so they are not double-listed.
    expect(props.navSections.some((s: MockNavSection) => s.label === "Verticals")).toBe(false);
  });
});
