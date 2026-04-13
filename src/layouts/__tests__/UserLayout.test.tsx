/**
 * @jest-environment jsdom
 */

import React from "react";
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

const DummyIcon = () => null;
jest.mock("@/constants/navigation", () => ({
  USER_NAV_ITEMS: [
    { to: "/home", icon: DummyIcon, label: "Home" },
    { to: "/dashboard", icon: DummyIcon, label: "Dashboard" },
  ],
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

  test("renders AlexFloating when tour is not running", () => {
    render(<UserLayout><div /></UserLayout>);
    expect(screen.getByTestId("alex-floating")).toBeInTheDocument();
  });

  test("does not render AlexFloating when tour is running", () => {
    mockUseTour.mockReturnValue({ isRunning: true });
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
});
