/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import SuperAdminLayout from "../SuperAdminLayout";

// 🔹 Mock ROUTES
jest.mock("@/constants/routes", () => ({
  ROUTES: {
    SUPER_ADMIN: {
      DASHBOARD: "/dashboard",
      USERS: "/users",
      COACHES: "/coaches",
      SETTINGS: "/settings",
    },
  },
}));

// 🔹 Mock lucide-react icons
jest.mock("lucide-react", () => ({
  LayoutDashboard: () => <span data-testid="icon-dashboard" />,
  UsersRound: () => <span data-testid="icon-users" />,
  Bot: () => <span data-testid="icon-bot" />,
  Settings: () => <span data-testid="icon-settings" />,
}));

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

    expect(props.navItems).toHaveLength(4);

    expect(props.navItems[0].label).toBe("Dashboard");
    expect(props.navItems[1].label).toBe("User Management");
    expect(props.navItems[2].label).toBe("Coach Management");
    expect(props.navItems[3].label).toBe("Settings");

    expect(props.navItems[0].to).toBe("/dashboard");
    expect(props.navItems[1].to).toBe("/users");
    expect(props.navItems[2].to).toBe("/coaches");
    expect(props.navItems[3].to).toBe("/settings");
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
