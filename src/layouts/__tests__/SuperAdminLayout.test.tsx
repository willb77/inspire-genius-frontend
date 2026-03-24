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
}));

// 🔹 Mock navigation with the nav items the layout uses
// Note: jest.mock is hoisted above variable declarations, so DummyIcon must be
// defined inside the factory function to avoid "Cannot access before initialization".
jest.mock("@/constants/navigation", () => {
  const DummyIcon = () => null;
  return {
    SUPER_ADMIN_NAV_ITEMS: [
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
  };
});

// 🔹 Capture navItems passed to SidebarScaffold
const mockSidebarScaffold = jest.fn();

jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: any) => {
    mockSidebarScaffold(props);
    return (
      <div data-testid="sidebar-scaffold" data-class={props.className}>
        {/* Render nav labels for testing */}
        <div data-testid="nav-items">
          {props.navItems.map((item: any) => (
            <div key={item.label}>{item.label}</div>
          ))}
        </div>
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

  test("passes correct nav items to SidebarScaffold", () => {
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    // Ensure SidebarScaffold was called
    expect(mockSidebarScaffold).toHaveBeenCalled();

    const props = mockSidebarScaffold.mock.calls[0][0];

    expect(props.navItems).toHaveLength(9);

    expect(props.navItems[0].label).toBe("Dashboard");
    expect(props.navItems[0].to).toBe("/super-admin/dashboard");
    expect(props.navItems[1].label).toBe("User Management");
    expect(props.navItems[4].label).toBe("Prompt Builder");
    expect(props.navItems[4].to).toBe("/super-admin/prompt-builder");
  });

  test("renders navigation labels", () => {
    render(
      <SuperAdminLayout>
        <div />
      </SuperAdminLayout>,
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Coach Management")).toBeInTheDocument();
    expect(screen.getByText("Prompt Builder")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
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
