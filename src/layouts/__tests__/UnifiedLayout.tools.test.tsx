/**
 * @jest-environment jsdom
 */

import { render } from "@testing-library/react";

const mockSidebarScaffold = jest.fn();
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: any) => {
    mockSidebarScaffold(props);
    return <div data-testid="sidebar-scaffold">{props.children}</div>;
  },
}));

jest.mock("@/hooks/audit/usePageViewAudit", () => ({
  usePageViewAudit: jest.fn(),
}));

const mockEntitled = jest.fn(() => [] as any[]);
jest.mock("@/hooks/nav/useGatedNavItems", () => ({
  useGatedNavItems: (role: string) =>
    role === "manager"
      ? [{ to: "/manager/dashboard", icon: () => null, label: "Manager Dashboard" }]
      : [{ to: "/home", icon: () => null, label: "Home" }],
  useEntitledVerticalItems: () => mockEntitled(),
}));

// Force the pilot flag ON for this suite (the real constant is computed from a
// build-time env var that is absent under jest) so the manager "Tools" rollup
// is populated and its composition is actually exercised.
jest.mock("@/constants/navigation", () => ({
  __esModule: true,
  ...jest.requireActual("@/constants/navigation"),
  TOOL_ITEMS_BY_ROLE: {
    manager: [{ to: "/manager/development", icon: () => null, label: "Team Development" }],
  },
}));

import UnifiedLayout from "../UnifiedLayout";

describe("UnifiedLayout — Tools rollup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEntitled.mockReturnValue([]);
  });

  test("manager gets a collapsed 'Tools' rollup containing Team Development", () => {
    render(
      <UnifiedLayout role="manager">
        <div />
      </UnifiedLayout>
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections).toBeDefined();
    // Header-less role menu first, Tools rollup second.
    expect(props.navSections[0].label).toBe("");
    const tools = props.navSections.find((s: any) => s.label === "Tools");
    expect(tools).toBeDefined();
    expect(tools.defaultCollapsed).toBe(true); // a rollup — collapsed by default
    expect(tools.items).toHaveLength(1);
    expect(tools.items[0].label).toBe("Team Development");
    expect(tools.items[0].to).toBe("/manager/development");
  });

  test("Tools rollup sits above the Verticals section when both exist", () => {
    mockEntitled.mockReturnValue([
      { to: "/vertical/grant", icon: () => null, label: "Financial Aid" },
    ]);
    render(
      <UnifiedLayout role="manager">
        <div />
      </UnifiedLayout>
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    const labels = props.navSections.map((s: any) => s.label);
    expect(labels).toEqual(["", "Tools", "Verticals"]);
  });

  test("a role with no tool items and no verticals gets no navSections", () => {
    render(
      <UnifiedLayout role="user">
        <div />
      </UnifiedLayout>
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections).toBeUndefined();
  });
});
