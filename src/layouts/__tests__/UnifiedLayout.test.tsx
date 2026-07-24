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

// UnifiedLayout sources the role menu from useGatedNavItems and the entitled
// verticals from useEntitledVerticalItems. Mock both so this suite tests
// UnifiedLayout's wiring in isolation (the entitlement hooks have their own
// coverage). Entitled verticals default to empty; one test overrides it.
type MockNav = Array<{ to: string; icon: () => null; label: string }>;
const mockEntitled = jest.fn(() => [] as MockNav);
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
  useEntitledVerticalItems: () => mockEntitled(),
}));

import UnifiedLayout from "../UnifiedLayout";
import { usePageViewAudit } from "@/hooks/audit/usePageViewAudit";

describe("UnifiedLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntitled.mockReturnValue([]);
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

  test("no navSections when the user has no entitled verticals", () => {
    render(<UnifiedLayout role="user"><div /></UnifiedLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections).toBeUndefined();
  });

  test("adds a collapsed 'Verticals' section when the user is entitled to verticals", () => {
    mockEntitled.mockReturnValue([{ to: "/vertical/grant", icon: () => null, label: "Financial Aid" }]);
    render(<UnifiedLayout role="user"><div /></UnifiedLayout>);
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections).toHaveLength(2);
    expect(props.navSections[0].label).toBe(""); // header-less role menu
    expect(props.navSections[1].label).toBe("Verticals");
    expect(props.navSections[1].defaultCollapsed).toBe(true);
    expect(props.navSections[1].items[0].label).toBe("Financial Aid");
  });
});
