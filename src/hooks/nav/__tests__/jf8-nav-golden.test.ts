/**
 * @jest-environment jsdom
 *
 * JF-8 — golden menus with `job_fit_v2` OFF.
 *
 * Every named customer on staging-b holds both `job-fit` and
 * `career-discovery`. Until the switch is on for them, every menu they can see
 * must be exactly today's. These snapshots pin, for all six roles: the role
 * menu (`NAV_ITEMS_BY_ROLE`), the menu a role actually gets
 * (`useGatedNavItems`, with the real workspace splice and the real vertical
 * registry, entitled to both keys), and the in-vertical menus for Job Fit and
 * Career & Education Discovery. A change to any of them fails here first.
 */
import { renderHook } from "@testing-library/react"
import "@/verticals"
import { NAV_ITEMS_BY_ROLE } from "@/constants/navigation"
import {
  CAREERS_AND_JOBS_LABEL,
  CAREERS_AND_JOBS_PATH,
  JOB_FIT_BLUEPRINT_USER_DISABLED_REASON,
  jobFitToolsFor,
  jobFitToolsForRole,
  verticalSubNavItems,
} from "@/constants/vertical-subnav"
import { ROUTES } from "@/constants/routes"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import type { UserRole } from "@/types/roles"
import { useGatedNavItems } from "../useGatedNavItems"

jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => ({
    data: ["job-fit", "career-discovery", "direction-setting", "grant", "lumen"],
    isLoading: false,
  }),
}))
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => false,
}))
jest.mock("@/hooks/super-admin/usePrismExam", () => ({ useExamAccess: () => ({ data: undefined }) }))
jest.mock("@/hooks/company-admin/useCohortReadout", () => ({
  useCohortReadoutEnabled: () => ({ data: undefined }),
}))

const ROLES: UserRole[] = ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"]

const show = (items: NavItemDef[]) =>
  items.map((i) => `${i.label} -> ${i.to}${i.disabled ? " (greyed)" : ""}`)

beforeEach(() => localStorage.clear())

describe("JF-8 — menus with job_fit_v2 off are today's", () => {
  it("covers all six roles (a walker over nothing proves nothing)", () => {
    expect(ROLES.every((r) => (NAV_ITEMS_BY_ROLE[r] ?? []).length > 0)).toBe(true)
  })

  it.each(ROLES)("useGatedNavItems(%s) — the menu the role gets", (role) => {
    const { result } = renderHook(() => useGatedNavItems(role))
    const items = show(result.current)
    // The two workspace verticals stay as today: one entry each, today's names and doors.
    expect(items).toContain("Career Fit -> /vertical/job-fit/matches")
    expect(items).toContain("Career & Education Discovery -> /vertical/career-discovery/journey")
    expect(items.some((i) => i.startsWith(CAREERS_AND_JOBS_LABEL))).toBe(false)
    expect(items).toMatchSnapshot()
  })

  it.each(ROLES)("Job Fit and Discovery in-vertical menus for %s", (role) => {
    expect({
      jobFit: show(verticalSubNavItems("job-fit", role)?.items ?? []),
      discovery: show(verticalSubNavItems("career-discovery", role)?.items ?? []),
      directionSetting: show(verticalSubNavItems("direction-setting", role)?.items ?? []),
    }).toMatchSnapshot()
  })

  it.each(ROLES)("jobFitToolsFor(%s, off) is today's list, by identity", (role) => {
    expect(jobFitToolsFor(role, false)).toBe(jobFitToolsForRole(role))
  })
})

describe("JF-8 — the Job Fit menu with job_fit_v2 on", () => {
  it("opens on Careers and Jobs and drops the two pages folded into it", () => {
    const manager = jobFitToolsFor("manager", true)
    expect(manager[0]).toMatchObject({ label: CAREERS_AND_JOBS_LABEL, to: CAREERS_AND_JOBS_PATH })
    expect(CAREERS_AND_JOBS_PATH).toBe("/vertical/job-fit/home")
    const to = manager.map((i) => i.to)
    expect(to).not.toContain(ROUTES.JOB_FIT.MATCHES)
    expect(to).not.toContain(ROUTES.JOB_FIT.GAPS)
    // Everything else Job Fit offers today is still there, in today's order.
    expect(to.slice(1)).toEqual(
      jobFitToolsForRole("manager")
        .map((i) => i.to)
        .filter((t) => t !== ROUTES.JOB_FIT.MATCHES && t !== ROUTES.JOB_FIT.GAPS),
    )
  })

  it("still greys Blueprint a role for the user role", () => {
    const blueprint = jobFitToolsFor("user", true).find((i) => i.to === ROUTES.JOB_FIT.BLUEPRINT)
    expect(blueprint).toMatchObject({ disabled: true, disabledReason: JOB_FIT_BLUEPRINT_USER_DISABLED_REASON })
    expect(jobFitToolsFor("manager", true).find((i) => i.to === ROUTES.JOB_FIT.BLUEPRINT)?.disabled).toBeFalsy()
  })

  it("leaves Direction Setting's own Career areas where it is (F-11)", () => {
    const ds = verticalSubNavItems("direction-setting", "user")?.items ?? []
    expect(ds.find((i) => i.label === "Career areas")?.to).toBe(ROUTES.DIRECTION_SETTING.CAREERS)
  })
})
