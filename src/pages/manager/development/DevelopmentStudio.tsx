/**
 * Team Development Studio — roster (route: /manager/development).
 *
 * Responsive roster grid with search / filter / sort, and skeleton, empty,
 * degraded (no-assessment) and error states. Rendered inside ManagerLayout →
 * AppShell. Cards navigate to the per-member workspace.
 */
import { Suspense, lazy, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Network, Search, UserCheck, Users, UsersRound } from "lucide-react"
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
import { PLAN_STATUS_LABEL, TDS_STUDIO_ENABLED } from "@/constants/development"
import type { PlanStatus, RosterMember } from "@/types/development"
import {
  useTeamDevelopmentRoster,
  useDevelopmentText,
} from "@/hooks/manager/development"
import { MemberCard } from "@/components/manager/development/MemberCard"
import { AddMemberDialog } from "@/components/manager/development/AddMemberDialog"
import { OrgChartPanel } from "@/components/manager/development/OrgChartPanel"
import { MyReportsPanel } from "@/components/manager/development/MyReportsPanel"
import { LinkRequestsPanel } from "@/components/manager/development/LinkRequestsPanel"
import {
  DevSkinProvider,
  DevPageFrame,
  getDevSkin,
  resolveDevV2,
  type DevVariant,
} from "@/components/manager/development/skin"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/context/useAuth"

/** U5 — Compare and Scenarios at Studio level. Loaded only when opened. */
const TeamStudioView = lazy(() => import("@/components/manager/development/TeamStudioView"))

/**
 * U2 — the "Coverage" filter asks one question: has this person taken PRISM?
 *
 * It used to count PRISM, CliftonStrengths and DISC and offer "Complete (3/3)",
 * "Partial" and "No assessments". The platform has no way to invite anyone to
 * CliftonStrengths or DISC, so 3/3 was a state nobody could reach and every
 * member with PRISM alone read as "Partial". Decision D5 (2026-11-24): both are
 * dropped from the Studio's filters, and still shown on a card where a member
 * has them (CoverageChips is untouched).
 */
type CoverageFilter = "all" | "has_prism" | "no_prism"
type SortKey = "readiness" | "activity"

const PLAN_ORDER: Record<PlanStatus, number> = {
  at_risk: 0,
  active: 1,
  draft: 2,
  on_track: 3,
  no_plan: 4,
}

function hasPrism(m: RosterMember): boolean {
  return Boolean(m.coverage.prism)
}

function readinessScore(m: RosterMember): number {
  // Simple client-side ordering signal: PRISM taken + milestone progress + top
  // match. CliftonStrengths and DISC no longer add to it (U2, D5): a member who
  // happens to have them is not "readier" than one with PRISM alone, and no
  // member can be invited to them here.
  return (hasPrism(m) ? 20 : 0) + (m.milestoneProgress ?? 0) / 2 + (m.topMatch?.fitScore ?? 0) / 4
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
  const { t: tm } = useTranslation("managerPages")
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
   * U1 — the first lens is named for what the server sends this caller.
   *
   * `/v1/growth/roster` scopes by role. A caller whose role is exactly
   * `manager` is sent their direct reports, plus people they added here and
   * anyone they hold a dossier for. Every other role that reaches this page
   * (practitioner, super-admin) is sent the organisation's people plus the same
   * additions. So "Whole organisation" would be false for a manager, and they
   * read "My team" instead. Wording only: the view state, the request and the
   * list are the same for both.
   *
   * The server decides on its own reading of the role; this is the browser's.
   * They agree for a person with one role. Someone who signed in as a manager
   * while also holding a higher role is sent the wider list under the narrower
   * name.
   */
  const { hasRole } = useAuth()
  const listIsOwnTeam = hasRole("manager")

  /**
   * Which view the first page is showing.
   *
   * Three DIFFERENT questions about the same organisation, which is why each
   * replaces the grid rather than sitting beside it and why the search/filter
   * row does not apply to two of them:
   *
   *   grid    — who needs what (the roster: the org's people plus anyone added
   *             here)
   *   reports — who reports to me (TDS-10; derived from the org chart's edges)
   *   org     — who reports to whom (the chart itself)
   *
   * Local state, not a route: these are lenses on this page, and a URL for each
   * would be three surfaces to keep gated instead of one.
   */
  const [view, setView] = useState<"grid" | "reports" | "org" | "team">("grid")

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
      rows = rows.filter((m) => (coverage === "has_prism" ? hasPrism(m) : !hasPrism(m)))
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

      {/* MMLR-6 — shown only while a member's request waits on this manager. */}
      <LinkRequestsPanel audience={audience} />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className={cn("relative w-full md:max-w-xs", view !== "grid" && "invisible")}>
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
          {/* The view pill.
              A toggle, not a filter: each option answers a DIFFERENT question
              about the same organisation, so each REPLACES the grid and the
              search/filter controls beside it do not apply to two of them.
              They are hidden outside the grid rather than left visible and
              inert, because a filter that silently does nothing is worse than
              one that is not offered. */}
          <div className="flex items-center rounded-full border p-0.5" role="group" aria-label={tm("developmentStudio.view", { defaultValue: "View" })}>
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                view === "grid" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >{listIsOwnTeam
              ? tm("developmentStudio.myTeam", { defaultValue: "My team" })
              : tm("developmentStudio.team", { defaultValue: "Whole organisation" })}</button>
            {/* TDS-10. "My reports" is a narrower set than the first lens, not a
                filter on it: the ids come from the org chart's surviving edges
                and the roster only supplies each card. See MyReportsPanel. */}
            <button
              type="button"
              onClick={() => setView("reports")}
              aria-pressed={view === "reports"}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition",
                view === "reports" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <UserCheck className="h-3 w-3" aria-hidden />{" "}{tm("developmentStudio.myReports", { defaultValue: "My reports" })}</button>
            <button
              type="button"
              onClick={() => setView("org")}
              aria-pressed={view === "org"}
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition",
                view === "org" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Network className="h-3 w-3" aria-hidden />{" "}{tm("developmentStudio.orgChart", { defaultValue: "Org Chart" })}</button>
            {/* U5 — Compare and Scenarios, picking people from the roster.
                Behind the same flag that offers them on a person's page. */}
            {TDS_STUDIO_ENABLED && (
              <button
                type="button"
                onClick={() => setView("team")}
                aria-pressed={view === "team"}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition",
                  view === "team" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <UsersRound className="h-3 w-3" aria-hidden />{" "}{tm("teamStudioView.lens", { defaultValue: "Compare & scenarios" })}</button>
            )}
          </div>
          {view === "grid" && (
          <>
          <Select value={coverage} onValueChange={(v) => setCoverage(v as CoverageFilter)}>
            <SelectTrigger className="w-[150px]" aria-label={t("dev.studio.filter.coverage")}>
              <SelectValue placeholder={t("dev.studio.filter.coverage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tm("developmentStudio.prismAll", { defaultValue: "PRISM: all" })}</SelectItem>
              <SelectItem value="has_prism">{tm("developmentStudio.hasPrism", { defaultValue: "Has PRISM" })}</SelectItem>
              <SelectItem value="no_prism">{tm("developmentStudio.prismNotTaken", { defaultValue: "PRISM not taken" })}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={plan} onValueChange={(v) => setPlan(v as PlanStatus | "all")}>
            <SelectTrigger className="w-[140px]" aria-label={t("dev.studio.filter.plan")}>
              <SelectValue placeholder={t("dev.studio.filter.plan")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tm("developmentStudio.allPlans", { defaultValue: "All plans" })}</SelectItem>
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
                <SelectItem value="all">{tm("developmentStudio.allDepartments", { defaultValue: "All departments" })}</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[150px]" aria-label={tm("developmentStudio.sortBy", { defaultValue: "Sort by" })}>
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

      {/*
        TDS-10 — which question the visible view answers, stated on the page.
        The three sets are genuinely different and were read as one: the roster
        is the organisation's people plus anyone added here, "My reports" is the
        reporting line INSIDE the caller's own organisation, and the chart is
        the lines themselves. A manager on staging-b has four reports on file
        and zero of them in their own organisation, so the first lens and "My reports"
        legitimately disagree for them — which is unreadable unless the page
        says what each one counts.
      */}
      {view !== "team" && <p className={cn("text-xs", sk.text500)}>
        {t(
          view === "reports"
            ? "dev.studio.scope.reports"
            : view === "org"
              ? "dev.studio.scope.org"
              : listIsOwnTeam
                ? "dev.studio.scope.myTeam"
                : "dev.studio.scope.team",
        )}
      </p>}

      {/* The search box filters the ROSTER, not the org chart — the chart is a
          different dataset with its own scope, and pointing this at it would
          filter people out of a reporting tree, leaving their reports
          reparented under whoever survived. */}
      {view === "team" ? (
        <Suspense fallback={<Skeleton className={cn("h-44 w-full", sk.radius)} />}>
          <TeamStudioView />
        </Suspense>
      ) : view === "org" ? (
        <OrgChartPanel memberRoute={memberRoute} />
      ) : view === "reports" ? (
        /* No roster loading/error/empty branch here: this panel owns its own
           states, and they are DIFFERENT claims from the grid's. "No team
           members yet" over a manager whose reports are all cross-org would be
           false, and a load failure shown as an empty team is the failure mode
           this whole surface keeps having to defend against. */
        <MyReportsPanel onInvite={handleInvite} memberRoute={memberRoute} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-44 w-full", sk.radius)} />
          ))}
        </div>
      ) : isError ? (
        <div className={cn("flex flex-col items-center gap-3 border border-dashed py-16 text-center", sk.radius, sk.border200)}>
          <p className={cn("text-sm", sk.text500)}>{t("dev.studio.error")}</p>
          <Button variant="outline" onClick={() => refetch()}>{tm("developmentStudio.retry", { defaultValue: "Retry" })}</Button>
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
        <div className={cn("border border-dashed py-16 text-center text-sm", sk.radius, sk.border200, sk.text500)}>{tm("developmentStudio.noMembersMatchTheCurrent", { defaultValue: "No members match the current filters." })}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m) => (
            <MemberCard key={m.memberId} member={m} onInvite={handleInvite} memberRoute={memberRoute} />
          ))}
        </div>
      )}
        </DevPageFrame>
      </DevSkinProvider>
    </Layout>
  )
}
