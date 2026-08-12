/**
 * @jest-environment jsdom
 */

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

// UnifiedLayout sources the role menu from useGatedNavItems and the single
// consolidated Tools section from useToolsSection. Mock both so this suite
// tests UnifiedLayout's wiring in isolation (each hook has its own coverage).
// Tools defaults to null — the real hook returns null for every role this
// layout serves — and individual tests override it.
const mockTools = jest.fn(() => null as unknown);
jest.mock("@/hooks/nav/useToolsSection", () => ({
  useToolsSection: () => mockTools(),
}));
jest.mock("@/hooks/nav/useGatedNavItems", () => ({
  useGatedNavItems: (role: string) => {
    const map: Record<string, Array<{ to: string; icon: () => null; label: string }>> = {
      user: [
        { to: "/home", icon: () => null, label: "Home" },
        { to: "/dashboard", icon: () => null, label: "Dashboard" },
      ],
      manager: [{ to: "/manager/dashboard", icon: () => null, label: "Manager Dashboard" }],
    };
    return map[role] ?? map.user;
  },
}));

import UnifiedLayout from "../UnifiedLayout";
import { usePageViewAudit } from "@/hooks/audit/usePageViewAudit";

describe("UnifiedLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTools.mockReturnValue(null);
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

  test("no navSections when there is no Tools section for this role", () => {
    render(<UnifiedLayout role="user"><div /></UnifiedLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections).toBeUndefined();
  });

  test("adds an EXPANDED 'Tools' section beneath the role menu", () => {
    // Was a separate "Verticals" section until 2026-08-12; verticals now live
    // inside the one Tools section. Expanded either way — the section lists the
    // full catalogue with unentitled entries greyed, so it is a menu to browse
    // rather than a drawer to remember to open.
    mockTools.mockReturnValue({
      label: "Tools",
      defaultCollapsed: false,
      items: [{ to: "/vertical/grant", icon: () => null, label: "Financial Aid" }],
    });
    render(<UnifiedLayout role="user"><div /></UnifiedLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections).toHaveLength(2);
    expect(props.navSections[0].label).toBe(""); // header-less role menu
    expect(props.navSections[1].label).toBe("Tools");
    expect(props.navSections[1].defaultCollapsed).toBe(false);
    expect(props.navSections[1].items[0].label).toBe("Financial Aid");
  });

  test("passes a vertical's disabled flag through to the sidebar untouched", () => {
    // The layout must not second-guess the greying decided upstream: an
    // unentitled vertical stays disabled all the way to the sidebar.
    mockTools.mockReturnValue({
      label: "Tools",
      defaultCollapsed: false,
      items: [
        { to: "/vertical/grant", icon: () => null, label: "Financial Aid", disabled: true },
      ],
    });
    render(<UnifiedLayout role="user"><div /></UnifiedLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections[1].items[0].disabled).toBe(true);
  });
});
