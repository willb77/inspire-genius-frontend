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

// 🔹 Mock navigation. RM-9b (2026-11-26): the super-admin menu is the house
// menu only — six groups + Advanced, Tools, My Workspace, the pinned footer —
// so the classic SUPER_ADMIN_NAV_SECTIONS (Administration, Role Views) is gone
// from the code and from this mock.
jest.mock("@/constants/navigation", () => {
  const DummyIcon = () => null;
  return {
    SUPER_ADMIN_HOUSE_FOOTER_ITEMS: [
      { to: "/super-admin/settings", icon: DummyIcon, label: "Settings" },
      { to: "/help", icon: DummyIcon, label: "Help & Support" },
    ],
    getUserNavItems: () => [
      { to: "/home", icon: DummyIcon, label: "Home" },
      { to: "/meridian/chat", icon: DummyIcon, label: "Chat with Meridian" },
      { to: "/documents", icon: DummyIcon, label: "My Documents" },
      { to: "/settings", icon: DummyIcon, label: "Settings" },
      { to: "/help", icon: DummyIcon, label: "Help & Support" },
    ],
    OWNER_ONLY_NAV_ROUTES: new Set<string>(["/super-admin/dev-traffic-report"]),
    isPlatformOwner: (email: string | null | undefined) =>
      (email ?? "").trim().toLowerCase() === "owner@example.test",
  };
});
jest.mock("@/constants/house/superAdminNav", () => {
  const DummyIcon = () => null;
  return {
    HOUSE_SUPER_ADMIN_SECTIONS: [
      {
        label: "",
        items: [{ to: "/super-admin/dashboard", icon: DummyIcon, label: "Admin home" }],
      },
      {
        label: "People",
        collapsible: true,
        items: [{ to: "/super-admin/users", icon: DummyIcon, label: "People" }],
      },
      {
        label: "Advanced",
        defaultCollapsed: true,
        items: [
          { to: "/super-admin/explainability", icon: DummyIcon, label: "Why the AI answered" },
          // Filtered: Settings is in the pinned footer (RM-8).
          { to: "/super-admin/settings", icon: DummyIcon, label: "Settings" },
          // Owner-only — filtered out for non-owner super-admins.
          { to: "/super-admin/dev-traffic-report", icon: DummyIcon, label: "Dev Traffic Report" },
        ],
      },
    ],
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
type MockNavSection = { label: string; items: MockNavItem[]; defaultCollapsed?: boolean; collapsible?: boolean };
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

  test("passes the house super-admin menu to SidebarScaffold (RM-9b: the only one)", () => {
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    // Groups, then (no Tools here: mockLauncher is null), My Workspace, footer.
    expect(props.navSections.map((s: MockNavSection) => s.label)).toEqual(["", "People", "Advanced", "My Workspace", ""]);
    // Admin pages keep My Workspace collapsed (SidebarScaffold opens it on a page it holds).
    expect(props.navSections[3].defaultCollapsed).toBe(true);
    // No classic sections.
    expect(screen.queryByTestId("section-Role Views")).not.toBeInTheDocument();
    expect(screen.queryByTestId("section-Administration")).not.toBeInTheDocument();
  });

  test("renders the group rows, My Workspace and the footer", () => {
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );
    expect(screen.getByText("Admin home")).toBeInTheDocument();
    expect(screen.getByText("Why the AI answered")).toBeInTheDocument();
    expect(screen.getByText("My Workspace")).toBeInTheDocument();
    expect(screen.getByText("Chat with Meridian")).toBeInTheDocument();
    const props = mockSidebarScaffold.mock.calls[0][0];
    const footer = props.navSections.at(-1);
    expect(footer.pinned).toBe(true);
    expect(footer.items.map((i: MockNavItem) => i.label)).toEqual(["Settings", "Help & Support"]);
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
    // the floating Financial Aid preview pill is gone from every super-admin page
    expect(screen.queryByTestId("grant-preview-toggle")).not.toBeInTheDocument();
  });

  test("Tools sits after the groups and before My Workspace", () => {
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
    expect(props.navSections.map((s: MockNavSection) => s.label)).toEqual(["", "People", "Advanced", "Tools", "My Workspace", ""]);
    expect(props.navSections[3].items[0].label).toBe("Honor Foundation");
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

  test("renders exactly ONE 'Tools' section, closed, in hook order", () => {
    // The merge itself moved into useToolsSection (2026-08-12) and is covered
    // there. What this layout still owns is placing that ONE section: two
    // same-labelled sections collided on SidebarScaffold's key={section.label},
    // which is what made a Tools group appear only when Administration was
    // toggled. Count, not lookup, is the assertion that catches a regression.
    mockLauncher.mockReturnValue({
      label: "Tools",
      defaultCollapsed: true,
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
    // The layout passes the hook's default through untouched (closed since
    // 2026-10-12); it must not force Tools open the way it used to.
    expect(toolsSections[0].defaultCollapsed).toBe(true);
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
    const advanced = props.navSections.find((s: MockNavSection) => s.label === "Advanced");
    expect(advanced.items.map((i: MockNavItem) => i.label)).toEqual(["Why the AI answered"]);
    expect(screen.queryByText("Dev Traffic Report")).not.toBeInTheDocument();
  });

  test("keeps the Dev Traffic Report item for the platform owner", () => {
    mockEmail = "owner@example.test";
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    const advanced = props.navSections.find((s: MockNavSection) => s.label === "Advanced");
    expect(advanced.items.map((i: MockNavItem) => i.label)).toEqual(["Why the AI answered", "Dev Traffic Report"]);
    expect(screen.getByText("Dev Traffic Report")).toBeInTheDocument();
  });

  test("Settings is in the footer only, never in a group", () => {
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    const inGroups = props.navSections
      .slice(0, -1)
      .flatMap((s: MockNavSection) => s.items)
      .filter((i: MockNavItem) => i.to === "/super-admin/settings");
    expect(inGroups).toEqual([]);
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
