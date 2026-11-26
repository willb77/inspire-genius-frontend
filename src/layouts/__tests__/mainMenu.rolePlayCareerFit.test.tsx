/**
 * @jest-environment jsdom
 *
 * Role Play and Career Fit in every role's main menu (2026-10-18, request:
 * "add Career Fit only, Change Practice Interview to Role Play and add both to
 * each users menu").
 *
 * Rendered through the REAL layouts with the REAL navigation constants, the
 * REAL workspace splice (`useWorkspaceNavItems`), the REAL Tools assembly
 * (`useToolsSection`) and the REAL vertical manifests. Only the entitlement
 * read, auth and the chrome itself are stubbed — so this fails if any layout
 * stops routing its menu through the splice, if Role Play is listed twice
 * (main menu AND Interview Studio), or if Career Fit leaks to an account that
 * is not entitled to `job-fit`.
 *
 * Each role is rendered through the layout that role's own pages use:
 * UserLayout for `user`, SuperAdminLayout for `super-admin` (whose main menu is
 * the "My Workspace" section), and UnifiedLayout for the other four.
 */

import { render } from "@testing-library/react";
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold";
import type { UserRole } from "@/types/roles";
import { ROUTES } from "@/constants/routes";
// Side-effect import: registers every vertical manifest, as main.tsx does.
import "@/verticals";

const mockSidebarScaffold = jest.fn();
// JF-8 menu wiring: the menus now read `job_fit_v2` (JF-7's status read). Off
// here, as today; the on state is covered in jf8-menu-wiring.test.tsx.
jest.mock("@/hooks/job-fit/useSavedJobs", () => ({
  ...jest.requireActual("@/hooks/job-fit/useSavedJobs"),
  useSavedJobsEnabled: () => false,
}))
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockSidebarScaffold(props);
    return null;
  },
}));

const mockUseEnabledVerticals = jest.fn();
// PRISM Exam grant read (2026-10-27): no grant, so these menus are unchanged.
jest.mock("@/hooks/super-admin/usePrismExam", () => ({
  useExamAccess: () => ({ data: undefined }),
}));
// N-3 cohort read-out menu gate (company-admin only): switch off, menus unchanged.
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: () => ({ data: undefined }),
}));
// RM-6 B: the practitioner client-roster status reads OFF here, so every
// menu below is today's menu (the switch-on menu has its own suite).
jest.mock("@/hooks/switches/usePractitionerClientRosterEnabled", () => ({
  usePractitionerClientRosterEnabled: () => false,
  usePractitionerClientRosterStatus: () => ({ data: false, isLoading: false }),
}));
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => mockUseEnabledVerticals(),
}));
// WS-1's workspace_direction_setting switch, held OFF: these menus are the
// switch-off contract, unchanged (the switch-ON menus are in
// mainMenu.directionSettingWorkspace.test.tsx).
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => false,
}));

const mockUseAuth = jest.fn();
jest.mock("@/context/useAuth", () => ({ useAuth: () => mockUseAuth() }));
jest.mock("@/lib/agentApi", () => ({ useAgentEngine: () => true }));
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: false } }),
}));
jest.mock("@/hooks/audit/usePageViewAudit", () => ({ usePageViewAudit: jest.fn() }));
jest.mock("@/components/grant/GrantPreviewToggle", () => ({
  __esModule: true,
  default: () => null,
}));

import UserLayout from "../UserLayout";
import SuperAdminLayout from "../SuperAdminLayout";
import UnifiedLayout from "../UnifiedLayout";

type Props = { navItems: NavItemDef[]; navSections?: NavSectionDef[] };

const ALL_ROLES: UserRole[] = [
  "user",
  "manager",
  "company-admin",
  "practitioner",
  "distributor",
  "super-admin",
];

type Entitlement = string[] | "loading";

function renderAs(role: UserRole, entitlement: Entitlement): Props {
  mockUseAuth.mockReturnValue({ user: { role, email: "someone@example.com" } });
  mockUseEnabledVerticals.mockReturnValue(
    entitlement === "loading"
      ? { data: undefined, isLoading: true }
      : { data: entitlement, isLoading: false },
  );
  mockSidebarScaffold.mockClear();
  const page = <div />;
  if (role === "user") render(<UserLayout>{page}</UserLayout>);
  else if (role === "super-admin") render(<SuperAdminLayout>{page}</SuperAdminLayout>);
  else render(<UnifiedLayout role={role}>{page}</UnifiedLayout>);
  return mockSidebarScaffold.mock.calls.at(-1)![0] as Props;
}

/** Every list SidebarScaffold renders — each section's items and each group's children. */
function renderedLists(props: Props): NavItemDef[][] {
  const tops = props.navSections ? props.navSections.map((s) => s.items) : [props.navItems];
  const walk = (items: NavItemDef[]): NavItemDef[][] => [
    items,
    ...items.flatMap((i) => (i.children?.length ? walk(i.children) : [])),
  ];
  return tops.flatMap(walk);
}

const allRows = (props: Props) => renderedLists(props).flat();

/** The role's main menu: "My Workspace" for super-admin, else the first list. */
/** The list Role Play and Career Fit live in: the "My Workspace" section for
 *  super-admin and, since RM-4 (RM-D1), for manager, company admin and
 *  practitioner; otherwise the first list (user, distributor). */
function mainMenu(_role: UserRole, props: Props): NavItemDef[] {
  const ws = props.navSections?.find((s) => s.label === "My Workspace");
  if (ws) return ws.items;
  return props.navSections ? props.navSections[0].items : props.navItems;
}

const CAREER_FIT_TO = ROUTES.JOB_FIT.MATCHES;

// The distributor menu is the five-item house-style menu since the classic
// distributor pages were removed (house style W2a, "remove"): Role Play and
// Résumé Writer are no longer in it (their routes still load by address), and
// workspace verticals sit just above its Help & Support tail.
const ROLE_PLAY_MENU_ROLES = ALL_ROLES.filter((r) => r !== "distributor");

describe("distributor — house-style menu", () => {
  test("Role Play and Résumé Writer are not in the sidebar", () => {
    for (const entitlement of [["job-fit"], [], "loading"] as Entitlement[]) {
      const props = renderAs("distributor", entitlement);
      const labels = allRows(props).map((i) => i.label);
      expect(labels).not.toContain("Role Play");
      expect(labels).not.toContain("Résumé Writer");
    }
  });

  test("Career & Education Discovery, then Career Fit, at the end of its own list (RM-4: Help is in the footer)", () => {
    const labels = mainMenu("distributor", renderAs("distributor", ["job-fit", "career-discovery"])).map((i) => i.label);
    expect(labels).toEqual([
      "Home",
      "My practitioners",
      "Credits",
      "Reports",
      "Career & Education Discovery",
      "Career Fit",
    ]);
  });
});

describe.each(ROLE_PLAY_MENU_ROLES)("%s — Role Play", (role) => {
  test("Role Play is in the main menu, pointing at /interview-practice, exactly once in the whole sidebar", () => {
    const props = renderAs(role, ["job-fit"]);
    const main = mainMenu(role, props);
    expect(main.filter((i) => i.label === "Role Play").map((i) => i.to)).toEqual([
      ROUTES.INTERVIEW_PRACTICE,
    ]);
    // Once across EVERY list, Tools and its groups included — by route and by label.
    expect(allRows(props).filter((i) => i.to === ROUTES.INTERVIEW_PRACTICE)).toHaveLength(1);
    expect(allRows(props).filter((i) => i.label === "Role Play")).toHaveLength(1);
    // The retired labels are gone from every list.
    const labels = allRows(props).map((i) => i.label);
    expect(labels).not.toContain("Interview Practice");
    expect(labels).not.toContain("Practice Interview");
  });

});

describe.each(ALL_ROLES)("%s — Career Fit", (role) => {
  test("Career Fit is in the main menu once, opening on My fit, when entitled to job-fit", () => {
    const props = renderAs(role, ["job-fit"]);
    const hits = mainMenu(role, props).filter((i) => i.label === "Career Fit");
    expect(hits.map((i) => i.to)).toEqual([CAREER_FIT_TO]);
    expect(hits[0].disabled).toBeFalsy();
    expect(allRows(props).filter((i) => i.to.startsWith(ROUTES.JOB_FIT.BASE))).toHaveLength(1);
  });

  test.each<[string, Entitlement]>([
    ["not entitled (nothing)", []],
    ["not entitled (other verticals)", ["grant", "lumen", "job-blueprint"]],
    ["entitlement still loading", "loading"],
  ])("Career Fit is absent — not greyed — when %s", (_name, entitlement) => {
    const props = renderAs(role, entitlement);
    expect(allRows(props).filter((i) => i.label === "Career Fit")).toEqual([]);
    expect(allRows(props).filter((i) => i.to.startsWith(ROUTES.JOB_FIT.BASE))).toEqual([]);
  });

  test("no list in the sidebar repeats a label (SidebarScaffold keys by label)", () => {
    for (const entitlement of [["job-fit"], [], "loading"] as Entitlement[]) {
      const props = renderAs(role, entitlement);
      for (const list of renderedLists(props)) {
        const labels = list.map((i) => i.label);
        expect(labels.filter((l, i) => labels.indexOf(l) !== i)).toEqual([]);
      }
    }
  });
});

describe("main-menu order around the new rows", () => {
  // 2026-10-29 (request): Career & Education Discovery then Career Fit sit in
  // FRONT of Role Play in every role's main menu; in the user's My Workspace,
  // My development moved after Role Play.
  test("user: the requested order, Career Fit in front of Role Play", () => {
    const labels = mainMenu("user", renderAs("user", ["job-fit"])).map((i) => i.label);
    expect(labels).toEqual([
      "Home",
      "Chat with Meridian",
      "Goals Studio",
      "Career Fit",
      "Role Play",
      "My development",
      "Résumé Writer",
      "Document Library",
      "Settings",
      "Help & Support",
    ]);
  });

  test.each(ROLE_PLAY_MENU_ROLES)("%s: Career & Education Discovery, then Career Fit, directly in front of Role Play", (role) => {
    const labels = mainMenu(role, renderAs(role, ["job-fit", "career-discovery"])).map((i) => i.label);
    const at = labels.indexOf("Role Play");
    expect(labels.slice(at - 2, at + 1)).toEqual(["Career & Education Discovery", "Career Fit", "Role Play"]);
  });

  // RM-4 (2026-11-25): My Workspace is the user menu less Home, Settings and
  // Help & Support, in the 2026-10-29 order — not the wireframe's.
  test.each(["manager", "company-admin", "practitioner"] as const)(
    "%s: My Workspace is the user menu less Home, Settings and Help, in the 2026-10-29 order",
    (role) => {
      const labels = mainMenu(role, renderAs(role, ["job-fit", "career-discovery"])).map((i) => i.label);
      expect(labels).toEqual([
        "Chat with Meridian",
        "Goals Studio",
        "Career & Education Discovery",
        "Career Fit",
        "Role Play",
        "My development",
        "Résumé Writer",
        "Document Library",
      ]);
    },
  );
});

// ── Résumé Writer (2026-10-19, request) — one row in every role's main menu ──
describe.each(ROLE_PLAY_MENU_ROLES)("%s — Résumé Writer", (role) => {
  // Right after My development: every role's Résumé Writer is in a My
  // Workspace list in the 2026-10-29 order (user, super-admin and, since RM-4,
  // manager, company admin and practitioner).
  const before = "My development";
  test(`is in the main menu once, right after ${before}, pointing at /my/resume, never greyed`, () => {
    for (const entitlement of [["job-fit"], [], "loading"] as Entitlement[]) {
      const props = renderAs(role, entitlement);
      const main = mainMenu(role, props);
      const labels = main.map((i) => i.label);
      const hits = main.filter((i) => i.label === "Résumé Writer");
      expect(hits.map((i) => i.to)).toEqual([ROUTES.MY_RESUME]);
      expect(hits[0].disabled).toBeFalsy();
      expect(labels.indexOf("Résumé Writer")).toBe(labels.indexOf(before) + 1);
      expect(allRows(props).filter((i) => i.to === ROUTES.MY_RESUME)).toHaveLength(1);
    }
  });
});
