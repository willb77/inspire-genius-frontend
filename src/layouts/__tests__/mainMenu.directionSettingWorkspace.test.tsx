/**
 * @jest-environment jsdom
 *
 * WS-1 — Direction Setting in My Workspace, dark behind the
 * `workspace_direction_setting` switch (CSA 2026-10-22-ws-1, option 2).
 *
 * Rendered through the REAL layouts, the REAL navigation constants, the REAL
 * workspace splice, the REAL Tools assembly and the REAL vertical manifests —
 * the same harness as mainMenu.rolePlayCareerFit.test.tsx. Only the
 * entitlement read, the switch read, auth and the chrome are stubbed.
 *
 *   - OFF: every role's sidebar is exactly what it was before WS-1. Direction
 *     Setting is no main-menu row and stays in Tools for super-admin, manager
 *     and practitioner (live when entitled, greyed when not).
 *   - ON + entitled: one "Direction Setting" row in every role's main menu,
 *     between Career & Education Discovery and Career Fit (registry order is by
 *     key), above Document Library where the menu has one; gone from Tools.
 *   - ON + not entitled: no row anywhere — not in the menu, not in Tools.
 *     That is the existing workspace rule (Career Fit, Career Discovery): an
 *     unentitled workspace vertical is HIDDEN, not greyed.
 */

import { render } from "@testing-library/react";
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold";
import type { UserRole } from "@/types/roles";
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
// PRISM Exam grant read (2026-10-27): no grant, so these menus are unchanged.
jest.mock("@/hooks/super-admin/usePrismExam", () => ({
  useExamAccess: () => ({ data: undefined }),
}));
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => mockUseEnabledVerticals(),
}));

const mockSwitchOn = jest.fn(() => false);
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => mockSwitchOn(),
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
const TOOLS_ROLES: UserRole[] = ["super-admin", "manager", "practitioner"];

const DS_TO = "/vertical/direction-setting/journey";
const DS = "Direction Setting";
const ALL_THREE = ["career-discovery", "direction-setting", "job-fit"];

type Entitlement = string[] | "loading";

function renderAs(role: UserRole, entitlement: Entitlement, switchOn: boolean): Props {
  mockSwitchOn.mockReturnValue(switchOn);
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

function renderedLists(props: Props): NavItemDef[][] {
  const tops = props.navSections ? props.navSections.map((s) => s.items) : [props.navItems];
  const walk = (items: NavItemDef[]): NavItemDef[][] => [
    items,
    ...items.flatMap((i) => (i.children?.length ? walk(i.children) : [])),
  ];
  return tops.flatMap(walk);
}

const allRows = (props: Props) => renderedLists(props).flat();

function mainMenu(role: UserRole, props: Props): NavItemDef[] {
  if (role === "super-admin") {
    return props.navSections!.find((s) => s.label === "My Workspace")!.items;
  }
  return props.navSections ? props.navSections[0].items : props.navItems;
}

/** Every row of the Tools section, groups flattened; [] when the role has none. */
function toolsRows(props: Props): NavItemDef[] {
  const tools = props.navSections?.find((s) => s.label === "Tools");
  if (!tools) return [];
  const walk = (items: NavItemDef[]): NavItemDef[] =>
    items.flatMap((i) => [i, ...(i.children?.length ? walk(i.children) : [])]);
  return walk(tools.items);
}

/** A comparable snapshot of the whole sidebar (icons are components; drop them). */
function snapshot(props: Props) {
  const strip = (items: NavItemDef[]): unknown[] =>
    items.map((item) => ({
      ...item,
      icon: undefined,
      ...(item.children ? { children: strip(item.children) } : {}),
    }));
  return props.navSections
    ? props.navSections.map((s) => ({ ...s, items: strip(s.items) }))
    : strip(props.navItems);
}

afterEach(() => mockSwitchOn.mockReset());

// ── switch OFF: nothing moves ──────────────────────────────────────────
describe.each(ALL_ROLES)("%s — switch OFF", (role) => {
  test.each<[string, Entitlement]>([
    ["entitled to all three", ALL_THREE],
    ["entitled to direction-setting only", ["direction-setting"]],
    ["entitled to nothing", []],
    ["entitlement loading", "loading"],
  ])("no Direction Setting row in the main menu (%s)", (_n, ent) => {
    const props = renderAs(role, ent, false);
    expect(mainMenu(role, props).filter((i) => i.to === DS_TO)).toEqual([]);
  });
});

describe.each(TOOLS_ROLES)("%s — switch OFF keeps Direction Setting in Tools", (role) => {
  test("live when entitled", () => {
    const hits = toolsRows(renderAs(role, ALL_THREE, false)).filter((i) => i.to === DS_TO);
    expect(hits.map((i) => [i.label, !!i.disabled])).toEqual([[DS, false]]);
  });

  test("greyed when not entitled", () => {
    const hits = toolsRows(renderAs(role, [], false)).filter((i) => i.to === DS_TO);
    expect(hits.map((i) => [i.label, !!i.disabled])).toEqual([[DS, true]]);
  });
});

// ── switch ON + entitled: one row in every main menu, out of Tools ─────
describe.each(ALL_ROLES)("%s — switch ON, entitled", (role) => {
  test("Direction Setting is in the main menu once, live, opening the journey", () => {
    const props = renderAs(role, ALL_THREE, true);
    const hits = mainMenu(role, props).filter((i) => i.label === DS);
    expect(hits.map((i) => i.to)).toEqual([DS_TO]);
    expect(hits[0].disabled).toBeFalsy();
    expect(allRows(props).filter((i) => i.to === DS_TO)).toHaveLength(1);
  });

  // 2026-10-29 (request): Career & Education Discovery then Career Fit, in
  // front of Role Play. Direction Setting, where its switch is on, follows them
  // so it never splits that pair.
  test("it follows Career & Education Discovery and Career Fit, directly in front of Role Play", () => {
    const labels = mainMenu(role, renderAs(role, ALL_THREE, true)).map((i) => i.label);
    const at = labels.indexOf(DS);
    expect(labels.slice(at - 2, at + 2)).toEqual([
      "Career & Education Discovery",
      "Career Fit",
      DS,
      "Role Play",
    ]);
  });

  test("with only direction-setting entitled it still sits directly in front of Role Play", () => {
    const labels = mainMenu(role, renderAs(role, ["direction-setting"], true)).map((i) => i.label);
    expect(labels.filter((l) => l === DS)).toHaveLength(1);
    expect(labels.indexOf(DS)).toBe(labels.indexOf("Role Play") - 1);
  });

  test("no list in the sidebar repeats a label", () => {
    const props = renderAs(role, ALL_THREE, true);
    for (const list of renderedLists(props)) {
      const labels = list.map((i) => i.label);
      expect(labels.filter((l, i) => labels.indexOf(l) !== i)).toEqual([]);
    }
  });
});

describe("user menu — the full order with the switch ON", () => {
  test("Goals Studio, Career & Education Discovery, Career Fit, Direction Setting, then Role Play", () => {
    const labels = mainMenu("user", renderAs("user", ALL_THREE, true)).map((i) => i.label);
    const at = labels.indexOf("Role Play");
    expect(labels.slice(at - 4, at + 1)).toEqual([
      "Goals Studio",
      "Career & Education Discovery",
      "Career Fit",
      DS,
      "Role Play",
    ]);
  });
});

describe.each(TOOLS_ROLES)("%s — switch ON takes Direction Setting out of Tools", (role) => {
  test.each<[string, Entitlement]>([
    ["entitled", ALL_THREE],
    ["not entitled", []],
    ["entitlement loading", "loading"],
  ])("absent from Tools (%s)", (_n, ent) => {
    const props = renderAs(role, ent, true);
    expect(toolsRows(props).filter((i) => i.to === DS_TO || i.label === DS)).toEqual([]);
  });
});

// ── switch ON + not entitled: hidden, not greyed ───────────────────────
describe.each(ALL_ROLES)("%s — switch ON, not entitled", (role) => {
  test.each<[string, Entitlement]>([
    ["nothing", []],
    ["other verticals", ["career-discovery", "job-fit", "grant", "lumen"]],
    ["entitlement loading", "loading"],
  ])("no Direction Setting row anywhere in the sidebar (%s)", (_n, ent) => {
    const props = renderAs(role, ent, true);
    expect(allRows(props).filter((i) => i.to === DS_TO || i.label === DS)).toEqual([]);
  });

  test("everything else in the sidebar is what the switch-OFF sidebar shows, minus Tools' DS row", () => {
    const ent = ["career-discovery", "job-fit", "grant"];
    const off = renderAs(role, ent, false);
    const on = renderAs(role, ent, true);
    const dropDs = (p: Props): Props => ({
      navItems: p.navItems.filter((i) => i.to !== DS_TO),
      navSections: p.navSections?.map((s) => ({
        ...s,
        items: s.items.filter((i) => i.to !== DS_TO),
      })),
    });
    expect(snapshot(on)).toEqual(snapshot(dropDs(off)));
  });
});
