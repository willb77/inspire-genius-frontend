/**
 * @jest-environment jsdom
 *
 * UnifiedLayout's Tools wiring after the 2026-08-12 consolidation.
 *
 * This suite used to pin the opposite arrangement: a collapsed "Tools" rollup
 * for managers, plus a separate expanded "Verticals" section, with an assertion
 * that the labels came out as ["", "Tools", "Verticals"]. Both groups are now
 * one section built by `useToolsSection`, and it returns null for every role
 * this layout serves — so what needs pinning is that NO tool section reaches
 * these roles, and that when one does it arrives whole.
 */

import { render } from "@testing-library/react";

type MockItem = { to: string; icon: () => null; label: string; disabled?: boolean };
type MockSection = { label: string; defaultCollapsed?: boolean; items: MockItem[] };

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

jest.mock("@/hooks/nav/useGatedNavItems", () => ({
  useGatedNavItems: (role: string) =>
    role === "manager"
      ? [{ to: "/manager/dashboard", icon: () => null, label: "Manager Dashboard" }]
      : [{ to: "/home", icon: () => null, label: "Home" }],
}));

// The real hook is exercised in hooks/nav/__tests__/useToolsSection.test.ts.
// Here it is mocked so this suite tests UnifiedLayout's wiring alone — but the
// mock honours the same role gate, or these tests would not be describing the
// app's actual behaviour.
const mockToolsSection = jest.fn();
jest.mock("@/hooks/nav/useToolsSection", () => ({
  useToolsSection: (role: string) => mockToolsSection(role),
}));

import UnifiedLayout from "../UnifiedLayout";

const TOOLS_SECTION = {
  label: "Tools",
  defaultCollapsed: false,
  items: [
    { to: "/manager/development", icon: () => null, label: "Team Development Studio" },
    { to: "/vertical/grant/dashboard", icon: () => null, label: "Financial Aid" },
  ],
};

describe("UnifiedLayout — Tools gating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToolsSection.mockReturnValue(null);
  });

  test.each(["manager", "company-admin", "practitioner", "distributor"] as const)(
    "%s gets no navSections at all — Tools is super-admin only",
    (role) => {
      render(
        <UnifiedLayout role={role}>
          <div />
        </UnifiedLayout>,
      );
      const props = mockSidebarScaffold.mock.calls[0][0];
      expect(props.navSections).toBeUndefined();
      // The flat role menu still reaches the sidebar — losing Tools must not
      // cost these roles their own navigation.
      expect(props.navItems.length).toBeGreaterThan(0);
    },
  );

  test("passes the role straight through to the gate", () => {
    render(
      <UnifiedLayout role="practitioner">
        <div />
      </UnifiedLayout>,
    );
    expect(mockToolsSection).toHaveBeenCalledWith("practitioner");
  });

  test("renders exactly ONE Tools section when the hook returns one", () => {
    // The bug this consolidation fixes was two sections both labelled "Tools",
    // which collide on SidebarScaffold's key={section.label}. One is the
    // invariant, so it is asserted by count rather than by lookup.
    mockToolsSection.mockReturnValue(TOOLS_SECTION);
    render(
      <UnifiedLayout role="super-admin">
        <div />
      </UnifiedLayout>,
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    const labels = props.navSections.map((s: MockSection) => s.label);
    expect(labels).toEqual(["", "Tools"]);
    expect(labels.filter((l: string) => l === "Tools")).toHaveLength(1);
  });

  test("keeps the section EXPANDED and its items intact", () => {
    mockToolsSection.mockReturnValue(TOOLS_SECTION);
    render(
      <UnifiedLayout role="super-admin">
        <div />
      </UnifiedLayout>,
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    const tools = props.navSections.find((s: MockSection) => s.label === "Tools");
    expect(tools.defaultCollapsed).toBe(false);
    expect(tools.items.map((i: MockItem) => i.label)).toEqual([
      "Team Development Studio",
      "Financial Aid",
    ]);
  });

  test("no longer emits a separate 'Verticals' section", () => {
    // Verticals were folded into Tools. A reappearing "Verticals" group would
    // mean the old two-section shape had crept back.
    mockToolsSection.mockReturnValue(TOOLS_SECTION);
    render(
      <UnifiedLayout role="super-admin">
        <div />
      </UnifiedLayout>,
    );
    const props = mockSidebarScaffold.mock.calls[0][0];
    expect(props.navSections.map((s: MockSection) => s.label)).not.toContain("Verticals");
  });
});
