/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";

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

jest.mock("@/hooks/audit/usePageViewAudit", () => ({
  usePageViewAudit: jest.fn(),
}));

const DummyIcon = () => null;
jest.mock("@/constants/navigation", () => ({
  NAV_ITEMS_BY_ROLE: {
    user: [
      { to: "/home", icon: DummyIcon, label: "Home" },
      { to: "/dashboard", icon: DummyIcon, label: "Dashboard" },
    ],
    manager: [
      { to: "/manager/dashboard", icon: DummyIcon, label: "Manager Dashboard" },
    ],
  },
}));

import UnifiedLayout from "../UnifiedLayout";
import { usePageViewAudit } from "@/hooks/audit/usePageViewAudit";

describe("UnifiedLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders children", () => {
    render(
      <UnifiedLayout role="user">
        <div data-testid="child">Hello</div>
      </UnifiedLayout>
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  test("passes role-specific nav items for 'user' role", () => {
    render(<UnifiedLayout role="user"><div /></UnifiedLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navItems).toHaveLength(2);
    expect(props.navItems[0].label).toBe("Home");
  });

  test("passes role-specific nav items for 'manager' role", () => {
    render(<UnifiedLayout role="manager"><div /></UnifiedLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navItems).toHaveLength(1);
    expect(props.navItems[0].label).toBe("Manager Dashboard");
  });

  test("falls back to user nav items for unknown role", () => {
    render(<UnifiedLayout role={"unknown" as any}><div /></UnifiedLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navItems).toHaveLength(2); // falls back to NAV_ITEMS_BY_ROLE.user
  });

  test("calls usePageViewAudit with role", () => {
    render(<UnifiedLayout role="manager"><div /></UnifiedLayout>);
    expect(usePageViewAudit).toHaveBeenCalledWith("manager");
  });

  test("forwards expandOnPath and renderAfterContent", () => {
    render(
      <UnifiedLayout
        role="user"
        expandOnPath="/home"
        renderAfterContent={<div data-testid="after-content">Extra</div>}
      >
        <div />
      </UnifiedLayout>
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.expandOnPath).toBe("/home");
    expect(screen.getByTestId("after-content")).toBeInTheDocument();
  });

  test("forwards className", () => {
    render(<UnifiedLayout role="user" className="test-class"><div /></UnifiedLayout>);
    expect(screen.getByTestId("sidebar-scaffold")).toHaveAttribute("data-class", "test-class");
  });
});
