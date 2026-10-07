/**
 * @jest-environment jsdom
 *
 * "Tools visible at all times" (2026-10-07, request) — UserLayout pages (Home,
 * My Workspace, Chat) for every role, with the REAL `useToolsSection` gate and
 * the REAL navigation constants. Only the data hooks underneath them are
 * mocked, so this suite fails if either the layout stops passing the signed-in
 * role or the gate changes who gets Tools.
 *
 * Two properties are pinned for each of the six roles:
 *   1. a Tools section is present iff the role is manager, practitioner or
 *      super-admin;
 *   2. for the five non-super-admin roles, no destination and no label is
 *      rendered twice anywhere in the sidebar. (Super-admin's sidebar is out of
 *      scope for this change and is pinned only for duplicates within a
 *      section — see the last test.)
 */

import { render } from "@testing-library/react";
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold";

const mockSidebarScaffold = jest.fn();
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockSidebarScaffold(props);
    return null;
  },
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/useAuth", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("@/lib/agentApi", () => ({ useAgentEngine: () => true }));
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: false } }),
}));

// The vertical catalogue as an entitled manager sees it: the two Career Studio
// verticals plus Lumen. Workspace splice is identity (WORKSPACE_VERTICALS is
// empty in the app too).
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useWorkspaceNavItems: (items: unknown) => items,
  useVerticalLauncherSection: () => ({
    id: "verticals-launcher",
    label: "Tools",
    defaultCollapsed: true,
    items: [
      { to: "/vertical/job-blueprint", icon: () => null, label: "Job Blueprint Studio" },
      { to: "/vertical/job-fit/matches", icon: () => null, label: "Job Fit" },
      { to: "/vertical/lumen/dashboard", icon: () => null, label: "Lumen" },
    ],
  }),
}));

import UserLayout from "../UserLayout";

type Props = { navItems: NavItemDef[]; navSections?: NavSectionDef[] };

function renderAs(role: string): Props {
  mockUseAuth.mockReturnValue({ user: { role } });
  mockSidebarScaffold.mockClear();
  render(
    <UserLayout>
      <div />
    </UserLayout>,
  );
  return mockSidebarScaffold.mock.calls[0][0] as Props;
}

/** What SidebarScaffold actually renders: sections when given, else navItems. */
function renderedRows(props: Props): NavItemDef[] {
  const top = props.navSections ? props.navSections.flatMap((s) => s.items) : props.navItems;
  const walk = (items: NavItemDef[]): NavItemDef[] =>
    items.flatMap((i) => [i, ...walk(i.children ?? [])]);
  return walk(top);
}

const dupes = (values: string[]) => values.filter((v, i) => v && values.indexOf(v) !== i);

const WITH_TOOLS = ["manager", "practitioner", "super-admin"] as const;
const WITHOUT_TOOLS = ["user", "company-admin", "distributor"] as const;

describe("UserLayout — Tools on workspace pages, by role", () => {
  test.each(WITH_TOOLS)("%s sees the Tools section", (role) => {
    const props = renderAs(role);
    const labels = (props.navSections ?? []).map((s) => s.label);
    expect(labels).toContain("Tools");
  });

  test.each(WITHOUT_TOOLS)("%s sees no Tools section — the flat menu, unchanged", (role) => {
    const props = renderAs(role);
    expect(props.navSections).toBeUndefined();
    expect(props.navItems.map((i) => i.label)).toContain("Goals Studio");
  });

  test.each(["manager", "practitioner", ...WITHOUT_TOOLS] as const)(
    "%s: no destination or label is rendered twice",
    (role) => {
      const rows = renderedRows(renderAs(role));
      expect(dupes(rows.map((r) => r.to))).toEqual([]);
      expect(dupes(rows.map((r) => r.label))).toEqual([]);
    },
  );

  test.each(["manager", "practitioner"] as const)(
    "%s keeps Goals Studio and practice interviews — once, under Tools",
    (role) => {
      const props = renderAs(role);
      const [workspace, tools] = props.navSections ?? [];
      expect(workspace.items.map((i) => i.to)).not.toContain("/my/goals");
      expect(workspace.items.map((i) => i.to)).not.toContain("/interview-practice");
      const toolRows = renderedRows({ navItems: [], navSections: [tools] });
      expect(toolRows.map((r) => r.to)).toEqual(
        expect.arrayContaining(["/my/goals", "/interview-practice"]),
      );
      // The rest of the workspace menu survives the de-duplication.
      expect(workspace.items.map((i) => i.label)).toEqual(
        expect.arrayContaining(["Home", "Chat with Meridian", "Settings"]),
      );
    },
  );

  test("super-admin: no section renders the same destination twice", () => {
    const props = renderAs("super-admin");
    for (const section of props.navSections ?? []) {
      expect(dupes(section.items.map((i) => i.to))).toEqual([]);
    }
  });
});
