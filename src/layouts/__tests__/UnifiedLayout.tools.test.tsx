/**
 * @jest-environment jsdom
 *
 * UnifiedLayout's section wiring.
 *
 * Since RM-4 (2026-11-25) the layout takes the whole menu from
 * `useRoleMenuFrame` and lays it out with `frameSections`: own work, My
 * Workspace, Tools, footer for manager, company admin, practitioner and
 * distributor. A role outside the frame (user, super-admin) keeps the earlier
 * wiring: its own list, plus one Tools section when it has one.
 *
 * The frame's contents are covered in hooks/nav/__tests__/rm4-menu-frame.test.tsx;
 * here the frame is a fixed value and `frameSections` is the real one.
 */

import { render } from "@testing-library/react";

type MockItem = { to: string; icon: () => null; label: string; disabled?: boolean };
type MockSection = { label: string; defaultCollapsed?: boolean; items: MockItem[] };
type MockFrame = {
  own: MockItem[];
  workspace: MockItem[] | null;
  tools: MockSection | null;
  footer: MockItem[] | null;
};

const mockSidebarScaffold = jest.fn();
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: { children?: React.ReactNode }) => {
    mockSidebarScaffold(props);
    return <div data-testid="sidebar-scaffold">{props.children}</div>;
  },
}));

jest.mock("@/hooks/audit/usePageViewAudit", () => ({
  usePageViewAudit: jest.fn(),
}));

const mockFrame = jest.fn();
jest.mock("@/hooks/nav/useGatedNavItems", () => ({
  frameSections: jest.requireActual("@/hooks/nav/useGatedNavItems").frameSections,
  useRoleMenuFrame: (role: string) => mockFrame(role),
}));

import UnifiedLayout from "../UnifiedLayout";

const item = (to: string, label: string): MockItem => ({ to, icon: () => null, label });

const TOOLS_SECTION: MockSection = {
  label: "Tools",
  defaultCollapsed: true,
  items: [item("/bio-capture", "Bio Capture Studio"), item("/vertical/grant/dashboard", "Financial Aid")],
};
const OWN = [item("/manager/development", "Team Development Studio")];
const WORKSPACE = [item("/meridian/chat", "Chat with Meridian"), item("/my/goals", "Goals Studio")];
const FOOTER = [item("/manager/settings", "Settings"), item("/help", "Help & Support")];

function propsFor(role: string, frame: MockFrame) {
  mockFrame.mockReturnValue(frame);
  render(
    <UnifiedLayout role={role as never}>
      <div />
    </UnifiedLayout>,
  );
  return mockSidebarScaffold.mock.calls.at(-1)![0];
}

describe("UnifiedLayout — the RM-4 frame", () => {
  beforeEach(() => jest.clearAllMocks());

  test("passes the role straight through to the frame", () => {
    propsFor("practitioner", { own: OWN, workspace: null, tools: null, footer: null });
    expect(mockFrame).toHaveBeenCalledWith("practitioner");
  });

  test("a framed role: own work, My Workspace, Tools, footer — in that order", () => {
    const props = propsFor("manager", { own: OWN, workspace: WORKSPACE, tools: TOOLS_SECTION, footer: FOOTER });
    expect(props.navSections.map((s: MockSection) => s.label)).toEqual(["", "My Workspace", "Tools", ""]);
    expect(props.navSections[0].items).toBe(OWN);
    expect(props.navSections[1].items).toBe(WORKSPACE);
    expect(props.navSections[3].items).toBe(FOOTER);
  });

  test("My Workspace is a visible plain group, not collapsed (owner decision, 2026-10-12)", () => {
    const props = propsFor("manager", { own: OWN, workspace: WORKSPACE, tools: TOOLS_SECTION, footer: FOOTER });
    const ws = props.navSections.find((s: MockSection) => s.label === "My Workspace");
    expect(ws.defaultCollapsed).toBeUndefined();
    expect(ws.collapsible).toBeUndefined();
  });

  test("the distributor: own work and the footer only (RM-D3)", () => {
    const props = propsFor("distributor", { own: OWN, workspace: null, tools: null, footer: FOOTER });
    expect(props.navSections.map((s: MockSection) => s.label)).toEqual(["", ""]);
  });

  test("renders exactly ONE Tools section, whole", () => {
    // Two sections labelled "Tools" collide on SidebarScaffold's
    // key={section.label}, so the count is the invariant.
    const props = propsFor("manager", { own: OWN, workspace: WORKSPACE, tools: TOOLS_SECTION, footer: FOOTER });
    const tools = props.navSections.filter((s: MockSection) => s.label === "Tools");
    expect(tools).toHaveLength(1);
    expect(tools[0]).toBe(TOOLS_SECTION);
  });

  test("a role outside the frame with Tools (super-admin): own list then Tools, as before", () => {
    const props = propsFor("super-admin", { own: OWN, workspace: null, tools: TOOLS_SECTION, footer: null });
    expect(props.navSections.map((s: MockSection) => s.label)).toEqual(["", "Tools"]);
    expect(props.navSections[0].items).toBe(OWN);
  });

  test("a role outside the frame with no Tools (user): no sections, the flat list", () => {
    const props = propsFor("user", { own: OWN, workspace: null, tools: null, footer: null });
    expect(props.navSections).toBeUndefined();
    expect(props.navItems).toBe(OWN);
  });
});
