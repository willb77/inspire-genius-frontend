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
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockSidebarScaffold(props);
    return null;
  },
}));

const mockUseEnabledVerticals = jest.fn();
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
function mainMenu(role: UserRole, props: Props): NavItemDef[] {
  if (role === "super-admin") {
    return props.navSections!.find((s) => s.label === "My Workspace")!.items;
  }
  return props.navSections ? props.navSections[0].items : props.navItems;
}

const CAREER_FIT_TO = ROUTES.JOB_FIT.MATCHES;

describe.each(ALL_ROLES)("%s — Role Play and Career Fit", (role) => {
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
  test("user: Role Play, Résumé Writer, then Career Fit, then Document Library directly above Settings", () => {
    const labels = mainMenu("user", renderAs("user", ["job-fit"])).map((i) => i.label);
    expect(labels).toEqual([
      "Home",
      "Chat with Meridian",
      "Goals Studio",
      "My development",
      "Role Play",
      "Résumé Writer",
      "Career Fit",
      "Document Library",
      "Settings",
      "Help & Support",
    ]);
  });

  test.each(["manager", "company-admin", "distributor"] as const)(
    "%s: Role Play, Résumé Writer, then Career Fit sit directly above Settings",
    (role) => {
      const labels = mainMenu(role, renderAs(role, ["job-fit"])).map((i) => i.label);
      const at = labels.indexOf("Settings");
      expect(labels.slice(at - 3, at + 1)).toEqual(["Role Play", "Résumé Writer", "Career Fit", "Settings"]);
    },
  );

  test("practitioner: Role Play, Résumé Writer, then Career Fit close the menu (it has no Settings tail)", () => {
    const labels = mainMenu("practitioner", renderAs("practitioner", ["job-fit"])).map((i) => i.label);
    expect(labels.slice(-3)).toEqual(["Role Play", "Résumé Writer", "Career Fit"]);
  });
});

// ── Résumé Writer (2026-10-19, request) — one row in every role's main menu ──
describe.each(ALL_ROLES)("%s — Résumé Writer", (role) => {
  test("is in the main menu once, right after Role Play, pointing at /my/resume, never greyed", () => {
    for (const entitlement of [["job-fit"], [], "loading"] as Entitlement[]) {
      const props = renderAs(role, entitlement);
      const main = mainMenu(role, props);
      const labels = main.map((i) => i.label);
      const hits = main.filter((i) => i.label === "Résumé Writer");
      expect(hits.map((i) => i.to)).toEqual([ROUTES.MY_RESUME]);
      expect(hits[0].disabled).toBeFalsy();
      expect(labels.indexOf("Résumé Writer")).toBe(labels.indexOf("Role Play") + 1);
      expect(allRows(props).filter((i) => i.to === ROUTES.MY_RESUME)).toHaveLength(1);
    }
  });
});
