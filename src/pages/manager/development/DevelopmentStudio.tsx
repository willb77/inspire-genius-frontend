/**
 * Team Development Studio — roster (route: /manager/development).
 *
 * Responsive roster grid with search / filter / sort, and skeleton, empty,
 * degraded (no-assessment) and error states. Rendered inside ManagerLayout →
 * AppShell. Cards navigate to the per-member workspace.
 */
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Users } from "lucide-react"
import ManagerLayout from "@/layouts/ManagerLayout"
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

export default function DevelopmentStudio({ variant }: { variant?: DevVariant }) {
  const v2 = resolveDevV2(variant)
  const sk = getDevSkin(v2)
  const navigate = useNavigate()
  const { t } = useDevelopmentText()
  const { data: roster, isLoading, isError, refetch } = useTeamDevelopmentRoster()

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
    navigate(ROUTES.MANAGER.DEVELOPMENT_MEMBER.replace(":memberId", memberId))
  }

  return (
    <ManagerLayout>
      <DevSkinProvider v2={v2}>
        <DevPageFrame>
      <header className="space-y-1">
        <h1 className={cn("text-2xl font-semibold", sk.heading)}>{t("dev.studio.title")}</h1>
        <p className={cn("text-sm", sk.text500)}>{t("dev.studio.subtitle")}</p>
      </header>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-xs">
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
        </div>
      </div>

      {/* States */}
      {isLoading ? (
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
          <Button onClick={() => navigate(ROUTES.MANAGER.BULK_IMPORT)}>{t("dev.studio.empty.cta")}</Button>
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
    </ManagerLayout>
  )
}
