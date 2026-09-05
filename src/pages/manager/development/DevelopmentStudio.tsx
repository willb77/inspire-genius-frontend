/**
 * Team Development Studio — roster (route: /manager/development).
 *
 * Responsive roster grid with search / filter / sort, and skeleton, empty,
 * degraded (no-assessment) and error states. Rendered inside ManagerLayout →
 * AppShell. Cards navigate to the per-member workspace.
 */
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Network, Search, Users } from "lucide-react"
import ManagerLayout from "@/layouts/ManagerLayout"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { PLAN_STATUS_LABEL } from "@/constants/development"
import type { PlanStatus, RosterMember } from "@/types/development"
import {
  useTeamDevelopmentRoster,
  useDevelopmentText,
} from "@/hooks/manager/development"
import { MemberCard } from "@/components/manager/development/MemberCard"
import { AddMemberDialog } from "@/components/manager/development/AddMemberDialog"
import { OrgChartPanel } from "@/components/manager/development/OrgChartPanel"
import {
  DevSkinProvider,
  DevPageFrame,
  getDevSkin,
  resolveDevV2,
  type DevVariant,
} from "@/components/manager/development/skin"

type CoverageFilter = "all" | "complete" | "partial" | "none"
type SortKey = "readiness" | "activity"

const PLAN_ORDER: Record<PlanStatus, number> = {
  at_risk: 0,
  active: 1,
  draft: 2,
  on_track: 3,
  no_plan: 4,
}

function coverageCount(m: RosterMember): number {
  return [m.coverage.prism, m.coverage.clifton, m.coverage.disc].filter(Boolean).length
}

function readinessScore(m: RosterMember): number {
  // Simple client-side ordering signal: coverage + milestone progress + top match.
  return coverageCount(m) * 20 + (m.milestoneProgress ?? 0) / 2 + (m.topMatch?.fitScore ?? 0) / 4
}

function lastActivity(m: RosterMember): number {
  const dates = [m.coverage.prismAssessedAt, m.coverage.cliftonAssessedAt, m.coverage.discAssessedAt]
    .map((d) => (d ? new Date(d).getTime() : 0))
    .filter((n) => !Number.isNaN(n))
  return Math.max(0, ...dates)
}

/**
 * `audience` swaps the chrome and the member-link target for practitioners.
 *
 * A practitioner CANNOT be sent to /manager/development/:id — ProtectedRoute
 * gates by path prefix and `practitioner` has no `/manager` entry in
 * ROLE_PERMISSIONS, so the link would silently bounce them to their home page.
 * The roster itself needs no branch: /v1/growth/roster scopes to the caller's
 * own token, so each audience sees their own people.
 */
export default function DevelopmentStudio({
  variant,
  audience = "manager",
}: {
  variant?: DevVariant
  audience?: "manager" | "practitioner"
}) {
  const v2 = resolveDevV2(variant)
  const Layout = audience === "practitioner" ? PractitionerLayout : ManagerLayout
  const memberRoute =
    audience === "practitioner"
      ? ROUTES.PRACTITIONER.DEVELOPMENT_MEMBER
      : ROUTES.MANAGER.DEVELOPMENT_MEMBER
  const sk = getDevSkin(v2)
  const navigate = useNavigate()
  const { t } = useDevelopmentText()
  const { data: roster, isLoading, isError, refetch } = useTeamDevelopmentRoster()

  /**
   * Which view the first page is showing.
   *
   * The org chart is a different QUESTION about the same organisation — "who
   * reports to whom" rather than "who needs what" — so it replaces the grid
   * rather than sitting beside it, and the search/filter row does not apply to
   * it. Local state, not a route: it is a lens on this page, and a URL for it
   * would be a second surface to keep gated.
   */
  const [view, setView] = useState<"grid" | "org">("grid")

  const [search, setSearch] = useState("")
  const [coverage, setCoverage] = useState<CoverageFilter>("all")
  const [plan, setPlan] = useState<PlanStatus | "all">("all")
  const [department, setDepartment] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("readiness")

  const departments = useMemo(() => {
    const set = new Set<string>()
    roster?.forEach((m) => m.department && set.add(m.department))
    return Array.from(set).sort()
  }, [roster])

  const filtered = useMemo(() => {
    let rows = roster ?? []
    const q = search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.title ?? "").toLowerCase().includes(q) ||
          (m.department ?? "").toLowerCase().includes(q),
      )
    }
    if (coverage !== "all") {
      rows = rows.filter((m) => {
        const c = coverageCount(m)
        if (coverage === "complete") return c === 3
        if (coverage === "none") return c === 0
        return c > 0 && c < 3
      })
    }
    if (plan !== "all") rows = rows.filter((m) => m.planStatus === plan)
    if (department !== "all") rows = rows.filter((m) => m.department === department)

    const sorted = [...rows]
    if (sort === "readiness") {
      sorted.sort((a, b) => readinessScore(b) - readinessScore(a) || PLAN_ORDER[a.planStatus] - PLAN_ORDER[b.planStatus])
    } else {
      sorted.sort((a, b) => lastActivity(b) - lastActivity(a))
    }
    return sorted
  }, [roster, search, coverage, plan, department, sort])

  const handleInvite = (memberId: string) => {
    // Route to the member's workspace, where the header invite action is
    // correctly scoped to that member (avoids a mis-scoped roster-level call).
    navigate(memberRoute.replace(":memberId", memberId))
  }

  return (
    <Layout>
      <DevSkinProvider v2={v2}>
        <DevPageFrame>
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className={cn("text-2xl font-semibold", sk.heading)}>{t("dev.studio.title")}</h1>
          <p className={cn("text-sm", sk.text500)}>{t("dev.studio.subtitle")}</p>
        </div>
        <AddMemberDialog />
      </header>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className={cn("relative w-full md:max-w-xs", view === "org" && "invisible")}>
          <Search className={cn("pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2", sk.text400)} aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("dev.studio.search.placeholder")}
            aria-label={t("dev.studio.search.placeholder")}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* The Org Chart pill.
              A toggle, not a filter: the chart answers "who reports to whom"
              rather than "who needs what", so it REPLACES the grid and the
              search/filter controls beside it do not apply to it. They are
              hidden in chart view rather than left visible and inert, because
              a filter that silently does nothing is worse than one that is not
              offered. */}
          <div className="flex items-center rounded-full border p-0.5" role="group" aria-label="View">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                view === "grid" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              Team
            </button>
            <button
              type="button"
              onClick={() => setView("org")}
              aria-pressed={view === "org"}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition",
                view === "org" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Network className="h-3 w-3" aria-hidden /> Org Chart
            </button>
          </div>
          {view === "grid" && (
          <>
          <Select value={coverage} onValueChange={(v) => setCoverage(v as CoverageFilter)}>
            <SelectTrigger className="w-[150px]" aria-label={t("dev.studio.filter.coverage")}>
              <SelectValue placeholder={t("dev.studio.filter.coverage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All coverage</SelectItem>
              <SelectItem value="complete">Complete (3/3)</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="none">No assessments</SelectItem>
            </SelectContent>
          </Select>
          <Select value={plan} onValueChange={(v) => setPlan(v as PlanStatus | "all")}>
            <SelectTrigger className="w-[140px]" aria-label={t("dev.studio.filter.plan")}>
              <SelectValue placeholder={t("dev.studio.filter.plan")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {(Object.keys(PLAN_STATUS_LABEL) as PlanStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {PLAN_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {departments.length > 0 ? (
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-[150px]" aria-label={t("dev.studio.filter.department")}>
                <SelectValue placeholder={t("dev.studio.filter.department")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[150px]" aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="readiness">{t("dev.studio.sort.readiness")}</SelectItem>
              <SelectItem value="activity">{t("dev.studio.sort.activity")}</SelectItem>
            </SelectContent>
          </Select>
          </>
          )}
        </div>
      </div>

      {/* The search box filters the ROSTER, not the org chart — the chart is a
          different dataset with its own scope, and pointing this at it would
          filter people out of a reporting tree, leaving their reports
          reparented under whoever survived. */}
      {view === "org" ? (
        <OrgChartPanel memberRoute={memberRoute} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-44 w-full", sk.radius)} />
          ))}
        </div>
      ) : isError ? (
        <div className={cn("flex flex-col items-center gap-3 border border-dashed py-16 text-center", sk.radius, sk.border200)}>
          <p className={cn("text-sm", sk.text500)}>{t("dev.studio.error")}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (roster?.length ?? 0) === 0 ? (
        <div className={cn("flex flex-col items-center gap-3 border border-dashed py-16 text-center", sk.radius, sk.border200)}>
          <Users className={cn("h-8 w-8", sk.text400)} aria-hidden="true" />
          <div>
            <p className={cn("text-base font-medium", sk.text700)}>{t("dev.studio.empty.title")}</p>
            <p className={cn("mx-auto mt-1 max-w-sm text-sm", sk.text500)}>{t("dev.studio.empty.body")}</p>
          </div>
          <AddMemberDialog />
        </div>
      ) : filtered.length === 0 ? (
        <div className={cn("border border-dashed py-16 text-center text-sm", sk.radius, sk.border200, sk.text500)}>
          No members match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m) => (
            <MemberCard key={m.memberId} member={m} onInvite={handleInvite} />
          ))}
        </div>
      )}
        </DevPageFrame>
      </DevSkinProvider>
    </Layout>
  )
}
