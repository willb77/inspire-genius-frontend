/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
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
  };
});

// 🔹 Mock the agent-engine toggle hook used by the layout
jest.mock("@/lib/agentApi", () => ({
  useAgentEngine: () => true,
}));

// 🔹 Capture props passed to SidebarScaffold
const mockSidebarScaffold = jest.fn();

jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: any) => {
    mockSidebarScaffold(props);
    return (
      <div data-testid="sidebar-scaffold" data-class={props.className}>
        {/* Render section labels and nav labels for testing */}
        {props.navSections?.map((section: any) => (
          <div key={section.label}>
            <div data-testid={`section-${section.label}`}>{section.label}</div>
            {section.items.map((item: any) => (
              <div key={item.label}>{item.label}</div>
            ))}
          </div>
        ))}
        {props.children}
      </div>
    );
  },
}));

describe("SuperAdminLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    expect(props.navSections).toHaveLength(3);
    expect(props.navSections[0].label).toBe("My Workspace");
    expect(props.navSections[0].defaultCollapsed).toBe(true);
    expect(props.navSections[1].label).toBe("Administration");
    expect(props.navSections[1].items).toHaveLength(9);
    // Administration is expanded on super-admin pages (the user is mid-task)
    expect(props.navSections[1].defaultCollapsed).toBe(false);
    expect(props.navSections[2].label).toBe("Role Views");
    expect(props.navSections[2].items).toHaveLength(5);
    expect(props.navSections[2].defaultCollapsed).toBe(true);
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
});
