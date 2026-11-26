/**
 * @jest-environment jsdom
 *
 * RM-4 (2026-11-25) — the shared menu frame for manager, company admin,
 * practitioner and distributor: the role's own work, My Workspace, Tools and a
 * Settings / Help & Support footer.
 *
 * Rendered through the REAL UnifiedLayout with the REAL navigation constants,
 * workspace splice, Tools assembly and vertical manifests. Only the server
 * reads (entitlements, `job_fit_v2`, exam grant, cohort switch, alerts access),
 * the page-view audit and the chrome are stubbed.
 *
 * One guard per condition of the RM-4 GO (CSA #2217 §6), each mutation-tested:
 *   1. My Workspace is a visible plain group, not collapsed.
 *   2. My Workspace is in the 2026-10-29 order.
 *   3. Settings and Help routes as named; company admin never gets the
 *      /company-admin/settings placeholder; the practitioner's chat row stays
 *      at /meridian/chat.
 *   4. User and super-admin are outside the frame and unchanged.
 *   5. Talent Studio moves only for manager and practitioner, only under
 *      `job_fit_v2`, with today's rows.
 * Plus: one label and one destination once per sidebar, every destination in
 * the route table and under no other role's prefix, and no My Workspace for
 * the distributor (RM-D3).
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { render, renderHook } from "@testing-library/react"
import "@/verticals"
import type { NavItemDef, NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"

let mockV2 = false
jest.mock("@/hooks/job-fit/useSavedJobs", () => ({
  ...jest.requireActual("@/hooks/job-fit/useSavedJobs"),
  useSavedJobsEnabled: () => mockV2,
}))
let mockEntitled: string[] = []
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => ({ data: mockEntitled, isLoading: false }),
}))
let mockExamGranted = false
jest.mock("@/hooks/super-admin/usePrismExam", () => ({
  useExamAccess: (enabled: boolean) => ({
    data: enabled && mockExamGranted ? { allowed: true, super_admin: false } : undefined,
  }),
}))
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: () => ({ data: undefined }),
}))
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => false,
}))
jest.mock("@/hooks/super-admin/useBroadcast", () => ({
  useBroadcastAccess: () => ({ data: { authorized: false } }),
}))
jest.mock("@/hooks/audit/usePageViewAudit", () => ({ usePageViewAudit: jest.fn() }))
const mockSidebarScaffold = jest.fn()
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockSidebarScaffold(props)
    return null
  },
}))

import UnifiedLayout from "@/layouts/UnifiedLayout"
import { useRoleMenuFrame } from "../useGatedNavItems"
import { useToolsParts, useToolsSection, TALENT_STUDIO_LABEL } from "../useToolsSection"
import { ROUTES } from "@/constants/routes"

type Props = { navItems: NavItemDef[]; navSections?: NavSectionDef[] }

const FRAMED: UserRole[] = ["manager", "company-admin", "practitioner", "distributor"]
const WITH_WORKSPACE: UserRole[] = ["manager", "company-admin", "practitioner"]
const ROLE_PREFIXES = ["/super-admin", "/manager", "/company-admin", "/practitioner", "/distributor"]
const BOTH_CAREER = ["job-fit", "career-discovery"]

function sidebar(role: UserRole): Props {
  mockSidebarScaffold.mockClear()
  render(
    <UnifiedLayout role={role}>
      <div />
    </UnifiedLayout>,
  )
  return mockSidebarScaffold.mock.calls.at(-1)![0] as Props
}

const labelsOf = (items: NavItemDef[]) => items.map((i) => i.label)
const section = (props: Props, label: string) => props.navSections?.find((s) => s.label === label)
const flat = (items: NavItemDef[]): NavItemDef[] => items.flatMap((i) => [i, ...flat(i.children ?? [])])
const allRows = (props: Props) => (props.navSections ?? [{ label: "", items: props.navItems }]).flatMap((s) => flat(s.items))

beforeEach(() => {
  localStorage.clear()
  // Both tiers build with the company-admin house style on (CSA #2217 F25).
  localStorage.setItem("house_style_company-admin", "true")
  mockV2 = false
  mockEntitled = BOTH_CAREER
  mockExamGranted = false
})

const WORKSPACE_ORDER = [
  "Chat with Meridian",
  "Goals Studio",
  "Career & Education Discovery",
  "Career Fit",
  "Role Play",
  "My development",
  "Résumé Writer",
  "Document Library",
]

describe("RM-4 — each framed role's sidebar, section by section", () => {
  // Test builds leave VITE_FEATURE_TEAM_DEVELOPMENT unset, so the manager's
  // first rows are the pilot-off fallback (Dashboard, Member Oversight).
  const EXPECTED: Record<string, { sections: string[]; own: string[]; workspace: string[] | null }> = {
    manager: {
      sections: ["", "My Workspace", "Tools", ""],
      own: ["Dashboard", "Member Oversight", "Team Import", "Schedule"],
      workspace: WORKSPACE_ORDER,
    },
    "company-admin": {
      sections: ["", "My Workspace", ""],
      own: ["Dashboard", "People", "Organization", "Bulk Import", "Analytics", "AI Observability", "Culture Docs", "Surveys"],
      workspace: WORKSPACE_ORDER,
    },
    practitioner: {
      sections: ["", "My Workspace", "Tools", ""],
      own: [
        "Client Development Studio",
        "Practitioner Home",
        "My Clients",
        "Client PRISM Assessments",
        "My PRISM Practice",
        "Schedule",
        "Surveys",
        "Analytics",
      ],
      workspace: WORKSPACE_ORDER,
    },
    distributor: {
      sections: ["", ""],
      own: ["Home", "My practitioners", "Credits", "Reports", "Career & Education Discovery", "Career Fit"],
      workspace: null,
    },
  }

  it.each(FRAMED)("%s: own work, My Workspace, Tools and footer as the CSA §2 table", (role) => {
    const props = sidebar(role)
    const want = EXPECTED[role]
    expect(props.navSections!.map((s) => s.label)).toEqual(want.sections)
    expect(labelsOf(props.navSections![0].items)).toEqual(want.own)
    expect(section(props, "My Workspace") ? labelsOf(section(props, "My Workspace")!.items) : null).toEqual(
      want.workspace,
    )
    expect(labelsOf(props.navSections!.at(-1)!.items)).toEqual(["Settings", "Help & Support"])
  })
})

describe("condition 1 — My Workspace is a visible plain group", () => {
  it.each(WITH_WORKSPACE)("%s: no collapse flag and no toggle", (role) => {
    const ws = section(sidebar(role), "My Workspace")!
    expect(ws.defaultCollapsed).toBeUndefined()
    expect(ws.collapsible).toBeUndefined()
  })
})

describe("condition 2 — the 2026-10-29 order", () => {
  it.each(WITH_WORKSPACE)("%s: entitled verticals land in front of Role Play, My development after it", (role) => {
    expect(labelsOf(section(sidebar(role), "My Workspace")!.items)).toEqual(WORKSPACE_ORDER)
  })

  it.each(WITH_WORKSPACE)("%s: unentitled, the career verticals are absent, the rest in order", (role) => {
    mockEntitled = []
    expect(labelsOf(section(sidebar(role), "My Workspace")!.items)).toEqual(
      WORKSPACE_ORDER.filter((l) => l !== "Career Fit" && l !== "Career & Education Discovery"),
    )
  })
})

describe("condition 3 — Settings, Help and the chat row", () => {
  const FOOTER: Record<string, [string, string][]> = {
    manager: [["Settings", "/manager/settings"], ["Help & Support", "/help"]],
    "company-admin": [["Settings", "/settings"], ["Help & Support", "/help"]],
    practitioner: [["Settings", "/practitioner/settings"], ["Help & Support", "/help"]],
    distributor: [["Settings", "/distributor/settings"], ["Help & Support", "/help"]],
  }

  it.each(FRAMED)("%s: the footer is Settings then Help & Support, at the named routes", (role) => {
    const footer = sidebar(role).navSections!.at(-1)!
    expect(footer.label).toBe("")
    expect(footer.items.map((i) => [i.label, i.to])).toEqual(FOOTER[role])
  })

  it("company admin: the /company-admin/settings placeholder is in no section, house style on or off", () => {
    for (const house of ["true", "false"]) {
      localStorage.setItem("house_style_company-admin", house)
      const tos = allRows(sidebar("company-admin")).map((i) => i.to)
      expect({ house, placeholder: tos.includes(ROUTES.COMPANY_ADMIN.SETTINGS) }).toEqual({ house, placeholder: false })
      expect(tos).toContain(ROUTES.SETTINGS)
    }
  })

  it("practitioner: Chat with Meridian is /meridian/chat with the PRISM auto-load, whatever the legacy toggle says", () => {
    for (const toggle of [null, "true", "false"]) {
      localStorage.removeItem("agent_engine_enabled")
      if (toggle !== null) localStorage.setItem("agent_engine_enabled", toggle)
      const chat = section(sidebar("practitioner"), "My Workspace")!.items.find((i) => i.label === "Chat with Meridian")
      expect({ toggle, to: chat?.to, state: chat?.state }).toEqual({
        toggle,
        to: ROUTES.MERIDIAN_CHAT,
        state: { autoLoadPrism: true },
      })
    }
  })
})

describe("condition 4 — user and super-admin are outside the frame", () => {
  it.each(["user", "super-admin"] as const)("%s: no workspace section and no footer in the frame", (role) => {
    const { result } = renderHook(() => useRoleMenuFrame(role))
    expect(result.current.workspace).toBeNull()
    expect(result.current.footer).toBeNull()
  })

  it.each([false, true])("super-admin Tools are exactly useToolsSection's, Talent Studio and Goals Studio inside (job_fit_v2 %s)", (v2) => {
    mockV2 = v2
    mockEntitled = ["job-blueprint", "knowledge-continuity"]
    const parts = renderHook(() => useToolsParts("super-admin")).result.current
    const tools = renderHook(() => useToolsSection("super-admin")).result.current
    expect(parts.talentStudio).toBeNull()
    expect(parts.section).toEqual(tools)
    const labels = labelsOf(tools!.items)
    expect(labels).toContain("Goals Studio")
    expect(labels.includes(TALENT_STUDIO_LABEL)).toBe(v2)
  })
})

describe("condition 5 — Talent Studio", () => {
  beforeEach(() => {
    mockEntitled = ["job-blueprint", "knowledge-continuity", ...BOTH_CAREER]
  })

  it.each(["manager", "practitioner"] as const)(
    "%s, job_fit_v2 on: in the own-work list with today's rows, after the role's rows and before PRISM Exam; not in Tools",
    (role) => {
      mockV2 = true
      mockExamGranted = true
      const props = sidebar(role)
      const own = props.navSections![0].items
      const at = own.findIndex((i) => i.label === TALENT_STUDIO_LABEL)
      expect(at).toBeGreaterThan(0)
      expect(own.slice(at + 1).map((i) => i.label)).toEqual(["PRISM Exam"])
      expect(labelsOf(section(props, "Tools")!.items)).not.toContain(TALENT_STUDIO_LABEL)
      // Today's rows: the very group useToolsSection still builds for the role.
      const today = renderHook(() => useToolsSection(role)).result.current!.items.find(
        (i) => i.label === TALENT_STUDIO_LABEL,
      )
      expect(own[at]).toEqual(today)
    },
  )

  it.each(["manager", "practitioner"] as const)("%s, job_fit_v2 off: no Talent Studio, and Tools is useToolsSection's", (role) => {
    mockV2 = false
    const props = sidebar(role)
    expect(labelsOf(props.navSections![0].items)).not.toContain(TALENT_STUDIO_LABEL)
    expect(section(props, "Tools")).toEqual(renderHook(() => useToolsSection(role)).result.current)
  })

  it.each(["company-admin", "distributor"] as const)("%s, job_fit_v2 on: no Talent Studio anywhere", (role) => {
    mockV2 = true
    expect(labelsOf(allRows(sidebar(role)))).not.toContain(TALENT_STUDIO_LABEL)
  })
})

describe("every framed sidebar — uniqueness, routes, RM-D3", () => {
  const routesSource = readFileSync(join(process.cwd(), "src/routes.tsx"), "utf8")
  const routed = (to: string): boolean => {
    const vertical = /^(\/vertical\/[^/]+)(?:\/(.+))?$/.exec(to)
    if (!vertical) return routesSource.includes(`path: "${to}"`)
    const [, root, rest] = vertical
    return routesSource.includes(`path: "${root}"`) && (!rest || routesSource.includes(`path: "${rest}"`))
  }

  for (const v2 of [false, true]) {
    for (const ent of [[], ["job-blueprint", "knowledge-continuity", "lumen", "grant", ...BOTH_CAREER]]) {
      it.each(FRAMED)(`%s (job_fit_v2 ${v2}, ${ent.length} entitlements): each label and destination once`, (role) => {
        mockV2 = v2
        mockEntitled = ent
        mockExamGranted = true
        const rows = allRows(sidebar(role))
        const dupes = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i)
        expect(dupes(rows.map((r) => r.label))).toEqual([])
        expect(dupes(rows.map((r) => r.to).filter(Boolean))).toEqual([])
      })

      it.each(FRAMED)(`%s (job_fit_v2 ${v2}, ${ent.length} entitlements): every destination is routed and under no other role's prefix`, (role) => {
        mockV2 = v2
        mockEntitled = ent
        mockExamGranted = true
        const tos = allRows(sidebar(role)).map((r) => r.to).filter(Boolean)
        expect(tos.length).toBeGreaterThan(5)
        for (const to of tos) {
          expect({ to, routed: routed(to) }).toEqual({ to, routed: true })
          const foreign = ROLE_PREFIXES.filter((p) => p !== `/${role}`).find((p) => to.startsWith(`${p}/`))
          expect({ to, foreign }).toEqual({ to, foreign: undefined })
        }
      })
    }
  }

  it("the distributor has no My Workspace section (RM-D3)", () => {
    expect(section(sidebar("distributor"), "My Workspace")).toBeUndefined()
  })
})
