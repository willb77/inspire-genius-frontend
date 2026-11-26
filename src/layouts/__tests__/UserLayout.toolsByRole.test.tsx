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
// JF-13: useToolsSection reads `job_fit_v2` (useSavedJobsEnabled). This suite
// has no QueryClient and pins today's Tools section, so the switch is off here;
// the on state is covered in hooks/nav/__tests__/jf13-talent-studio.test.tsx.
jest.mock("@/hooks/job-fit/useSavedJobs", () => ({ useSavedJobsEnabled: () => false }));
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: false } }),
}));
// RM-1: manager, company-admin, practitioner and distributor now render
// UnifiedLayout on a UserLayout page. Its data hooks need a router and a
// QueryClient this suite does not have; stub them to "not granted / off", the
// same state a role sees before the reads return.
jest.mock("@/hooks/audit/usePageViewAudit", () => ({ usePageViewAudit: () => undefined }));
jest.mock("@/hooks/super-admin/usePrismExam", () => ({ useExamAccess: () => ({ data: undefined }) }));
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: () => ({ data: undefined }),
}));

// The vertical catalogue as an account entitled to job-fit sees it since
// 2026-10-18 (request): job-fit is in WORKSPACE_VERTICALS, so the launcher
// filters it OUT of the catalogue and the workspace splice puts "Career Fit" in
// the main menu instead. The splice uses the REAL withWorkspaceVerticals, so
// its position (above the Document Library/Settings/Help tail) is real too.
jest.mock("@/components/layout/useVerticalLauncher", () => {
  const actual = jest.requireActual("@/components/layout/useVerticalLauncher");
  const careerFit = { to: "/vertical/job-fit/matches", icon: () => null, label: "Career Fit" };
  return {
    useWorkspaceNavItems: (items: NavItemDef[]) => actual.withWorkspaceVerticals(items, [careerFit]),
    useVerticalLauncherSection: () => ({
      id: "verticals-launcher",
      label: "Tools",
      defaultCollapsed: true,
      items: [
        { to: "/vertical/job-blueprint", icon: () => null, label: "Job Blueprint Studio" },
        { to: "/vertical/lumen/dashboard", icon: () => null, label: "Lumen" },
      ],
    }),
  };
});

import UserLayout from "../UserLayout";
import UnifiedLayout from "../UnifiedLayout";
import { NAV_ITEMS_BY_ROLE } from "@/constants/navigation";
import type { UserRole } from "@/types/roles";

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

/** The same role rendered through its own layout (what /manager/* etc. show). */
function renderOwnLayout(role: UserRole): Props {
  mockUseAuth.mockReturnValue({ user: { role } });
  mockSidebarScaffold.mockClear();
  render(
    <UnifiedLayout role={role}>
      <div />
    </UnifiedLayout>,
  );
  return mockSidebarScaffold.mock.calls[0][0] as Props;
}

const WITH_TOOLS = ["manager", "practitioner", "super-admin"] as const;
const WITHOUT_TOOLS = ["user", "company-admin", "distributor"] as const;
/** RM-1: the roles whose own menu now shows on every UserLayout page. */
const OWN_MENU_ROLES = ["manager", "company-admin", "practitioner", "distributor"] as const;
/** Destinations only the user menu carries; none is in these roles' own menus. */
const USER_ONLY_DESTINATIONS = ["/home", "/documents", "/my/development"];

describe("RM-1 — a UserLayout page shows the signed-in role's own menu", () => {
  test.each(OWN_MENU_ROLES)("%s: every label of its own menu is in the sidebar", (role) => {
    const labels = renderedRows(renderAs(role)).map((r) => r.label);
    for (const item of NAV_ITEMS_BY_ROLE[role]) expect(labels).toContain(item.label);
  });

  test.each(OWN_MENU_ROLES)("%s: none of the user menu's own destinations is in the sidebar", (role) => {
    const destinations = renderedRows(renderAs(role)).map((r) => r.to);
    for (const to of USER_ONLY_DESTINATIONS) expect(destinations).not.toContain(to);
  });

  test.each(OWN_MENU_ROLES)("%s: the sidebar equals the one on the role's own pages", (role) => {
    const onUserPage = renderedRows(renderAs(role)).map((r) => `${r.label} -> ${r.to}`);
    const onOwnPage = renderedRows(renderOwnLayout(role)).map((r) => `${r.label} -> ${r.to}`);
    expect(onUserPage).toEqual(onOwnPage);
  });

  test.each(["user", "super-admin"] as const)("%s keeps the user-page chrome (My Workspace rows present)", (role) => {
    const destinations = renderedRows(renderAs(role)).map((r) => r.to);
    for (const to of USER_ONLY_DESTINATIONS) expect(destinations).toContain(to);
  });

  test("a role label outside the six (legacy) keeps the user menu", () => {
    const destinations = renderedRows(renderAs("manager-admin")).map((r) => r.to);
    for (const to of USER_ONLY_DESTINATIONS) expect(destinations).toContain(to);
  });
});

describe("UserLayout — Tools on workspace pages, by role", () => {
  test.each(WITH_TOOLS)("%s sees the Tools section", (role) => {
    const props = renderAs(role);
    const labels = (props.navSections ?? []).map((s) => s.label);
    expect(labels).toContain("Tools");
  });

  test.each(WITHOUT_TOOLS)("%s sees no Tools section — a flat menu", (role) => {
    const props = renderAs(role);
    expect(props.navSections).toBeUndefined();
  });

  test("user: the flat menu is the user menu, Goals Studio included", () => {
    expect(renderAs("user").navItems.map((i) => i.label)).toContain("Goals Studio");
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
    "%s keeps Goals Studio once under Tools, and Role Play + Career Fit once in the workspace half",
    (role) => {
      const props = renderAs(role);
      const [workspace, tools] = props.navSections ?? [];
      expect(workspace.items.map((i) => i.to)).not.toContain("/my/goals");
      const toolRows = renderedRows({ navItems: [], navSections: [tools] });
      expect(toolRows.map((r) => r.to)).toContain("/my/goals");
      // 2026-10-18 (request): Role Play and Career Fit are main-menu rows, NOT
      // Tools rows, so the workspace half keeps them and Tools lists neither.
      for (const to of ["/interview-practice", "/vertical/job-fit/matches"]) {
        expect(workspace.items.filter((i) => i.to === to)).toHaveLength(1);
        expect(toolRows.map((r) => r.to)).not.toContain(to);
      }
      expect(workspace.items.find((i) => i.to === "/interview-practice")?.label).toBe("Role Play");
      // RM-1: the first half is the role's own menu, not the user menu.
      expect(workspace.items.map((i) => i.label)).toEqual(
        expect.arrayContaining(NAV_ITEMS_BY_ROLE[role].map((i) => i.label)),
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
