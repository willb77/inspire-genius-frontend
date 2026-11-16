import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import {
  BookOpenCheck,
  Gauge,
  Layers,
  Clock,
  Inbox,
  GraduationCap,
  AlertTriangle,
} from "lucide-react"
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useContinuityAnalytics } from "@/hooks/knowledge-continuity/useContinuityAnalytics"
import { isKceAccessDenied } from "@/services/knowledge-continuity/authz"
import { KceAccessNotice } from "./KceAccessNotice"
import type {
  CapturePriority,
  CaptureSessionStats,
  TopAtRiskEntry,
} from "@/types/knowledge-continuity"

const PRIORITY_BADGE_CLASS: Record<CapturePriority, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-slate-100 text-slate-700 border-slate-200",
  low: "bg-muted text-muted-foreground",
}

const VALIDITY_BADGE_CLASS = {
  validated: "bg-emerald-100 text-emerald-700 border-emerald-200",
  provisional: "bg-teal-100 text-teal-700 border-teal-200",
  needs_review: "bg-amber-100 text-amber-700 border-amber-200",
  deprecated: "bg-slate-100 text-slate-500 border-slate-200",
} as const

type ValidityBand = keyof typeof VALIDITY_BADGE_CLASS
const VALIDITY_BANDS: ValidityBand[] = ["validated", "provisional", "needs_review", "deprecated"]

function validityLabel(t: TFunction, band: ValidityBand): string {
  switch (band) {
    case "validated":
      return t("dashboard.validity.validated", "Validated")
    case "provisional":
      return t("dashboard.validity.provisional", "Provisional")
    case "needs_review":
      return t("dashboard.validity.needs_review", "Needs review")
    case "deprecated":
      return t("dashboard.validity.deprecated", "Deprecated")
  }
}

// Chart fills for the validity-band distribution — meaningful, theme-consistent.
const VALIDITY_FILL: Record<keyof typeof VALIDITY_BADGE_CLASS, string> = {
  validated: "#16a34a", // green
  provisional: "#127A8A", // teal accent
  needs_review: "#64748b", // slate
  deprecated: "#dc2626", // red
}

// The capture pipeline funnel, in flow order.
const CAPTURE_STAGE_KEYS: (keyof CaptureSessionStats)[] = [
  "scheduled",
  "in_progress",
  "captured",
  "synthesized",
  "validated",
]

function captureStageLabel(t: TFunction, key: keyof CaptureSessionStats): string {
  switch (key) {
    case "scheduled":
      return t("dashboard.stage.scheduled", "Scheduled")
    case "in_progress":
      return t("dashboard.stage.in_progress", "In progress")
    case "captured":
      return t("dashboard.stage.captured", "Captured")
    case "synthesized":
      return t("dashboard.stage.synthesized", "Synthesized")
    default:
      return t("dashboard.stage.validated", "Validated")
  }
}

function NoDataYet() {
  const { t } = useTranslation("kcPages")
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
      {t("dashboard.noDataYet", "No data yet.")}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function formatPct(value: number | null, digits = 0): string {
  if (value === null || value === undefined) return "—"
  return `${(value * 100).toFixed(digits)}%`
}

function StatCardSkeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ValidityDistributionCard({
  bands,
}: {
  bands: Record<ValidityBand, number>
}) {
  const { t } = useTranslation("kcPages")
  const data = VALIDITY_BANDS.map((band) => ({
    label: validityLabel(t, band),
    count: bands[band],
    fill: VALIDITY_FILL[band],
  }))
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dashboard.validityDistributionTitle", "Validity-band distribution")}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <NoDataYet />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -16 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-muted-foreground"
                interval={0}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                formatter={(value: number) => [
                  t("dashboard.tooltipUnits", { defaultValue: "{{value}} units", value }),
                  t("dashboard.tooltipCount", "Count"),
                ]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.label} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function CapturePipelineCard({ sessions }: { sessions: CaptureSessionStats }) {
  const { t } = useTranslation("kcPages")
  const data = CAPTURE_STAGE_KEYS.map((key) => ({
    label: captureStageLabel(t, key),
    count: sessions[key],
  }))
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dashboard.capturePipelineTitle", "Capture pipeline")}</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <NoDataYet />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 24 }}
            >
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11, fill: "currentColor" }}
                className="text-muted-foreground"
                width={80}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                formatter={(value: number) => [
                  t("dashboard.tooltipSessions", { defaultValue: "{{value}} sessions", value }),
                  t("dashboard.tooltipCount", "Count"),
                ]}
              />
              <Bar dataKey="count" fill="#127A8A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Knowledge Continuity vertical landing page — the Program-Health dashboard.
 * Renders inside the shared AppShell via KceLayout. Summarizes how much
 * expert knowledge has been captured, how fresh it is, and which roles are
 * most at risk of walking out the door uncaptured. Deliberately plain
 * language — no raw PRISM dimension names surfaced here.
 */
export default function KceDashboardPage() {
  const { t } = useTranslation("kcPages")
  const { data: analytics, isLoading, isError, error } = useContinuityAnalytics()

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <BookOpenCheck className="h-5 w-5 text-[#127A8A]" />
          {t("dashboard.title", "Program Health")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.subtitle", "Capture progress, freshness, and knowledge-at-risk across the org.")}
        </p>
      </div>

      {isLoading && <StatCardSkeletons />}

      {!isLoading && isError && isKceAccessDenied(error) && <KceAccessNotice />}

      {!isLoading && isError && !isKceAccessDenied(error) && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("dashboard.loadError", "We couldn't load Program Health right now. Try again shortly.")}
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && !analytics && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t(
              "dashboard.empty",
              "No knowledge-capture activity yet. Once sessions are scheduled, program health will show up here."
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && analytics && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              icon={<Gauge className="h-4 w-4" />}
              label={t("dashboard.stat.meanKvi", "Mean KVI")}
              value={formatPct(analytics.mean_kvi, 0)}
              hint={t("dashboard.stat.meanKviHint", "knowledge validity index")}
            />
            <StatCard
              icon={<Layers className="h-4 w-4" />}
              label={t("dashboard.stat.coverage", "Coverage")}
              value={t("dashboard.stat.coverageValue", { defaultValue: "{{withUnits}}/{{total}} nodes", withUnits: analytics.coverage.nodes_with_units, total: analytics.coverage.taxonomy_nodes_total })}
              hint={t("dashboard.stat.coverageHint", { defaultValue: "{{units}} units captured", units: analytics.coverage.units_total })}
            />
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label={t("dashboard.stat.currency", "Currency")}
              value={formatPct(analytics.currency.pct_fresh, 0)}
              hint={t("dashboard.stat.currencyHint", "of captured knowledge is fresh")}
            />
            <StatCard
              icon={<Inbox className="h-4 w-4" />}
              label={t("dashboard.stat.reviewBacklog", "Review backlog")}
              value={
                analytics.review_queue.pending_approvals +
                analytics.review_queue.unresolved_contradictions
              }
              hint={t(
                "dashboard.stat.reviewBacklogHint",
                { defaultValue: "{{pending}} pending, {{contradictions}} contradictions", pending: analytics.review_queue.pending_approvals, contradictions: analytics.review_queue.unresolved_contradictions }
              )}
            />
            <StatCard
              icon={<GraduationCap className="h-4 w-4" />}
              label={t("dashboard.stat.curricula", "Curricula")}
              value={analytics.curricula.count}
              hint={t("dashboard.stat.curriculaHint", "published from captured knowledge")}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("dashboard.currencyTitle", "Currency of captured knowledge")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={(analytics.currency.pct_fresh ?? 0) * 100} />
              <p className="text-xs text-muted-foreground">
                {t(
                  "dashboard.currencySummary",
                  { defaultValue: "{{fresh}} fresh · {{stale}} stale (freshness window: {{days}} days)", fresh: analytics.currency.fresh_units, stale: analytics.currency.stale_units, days: analytics.fresh_days }
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("dashboard.validityTitle", "Validity of captured knowledge")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {VALIDITY_BANDS.map((band) => (
                  <div key={band} className="flex items-center gap-2">
                    <Badge variant="outline" className={VALIDITY_BADGE_CLASS[band]}>
                      {validityLabel(t, band)}
                    </Badge>
                    <span className="text-sm font-medium text-foreground">
                      {analytics.validity_bands[band]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <ValidityDistributionCard bands={analytics.validity_bands} />
            <CapturePipelineCard sessions={analytics.capture_sessions} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                {t("dashboard.atRiskTitle", "Knowledge at risk")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.risk_register.uncaptured_urgent > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {t("dashboard.urgentUncaptured", {
                    count: analytics.risk_register.uncaptured_urgent,
                    defaultValue_one: "{{count}} urgent role has not been captured yet.",
                    defaultValue_other: "{{count}} urgent roles have not been captured yet.",
    defaultValue: "{{count}} urgent roles have not been captured yet.",
                  })}
                </div>
              )}

              {analytics.risk_register.top_at_risk.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.noAtRisk", "No roles currently flagged as at risk.")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dashboard.col.role", "Role")}</TableHead>
                      <TableHead>{t("dashboard.col.kri", "KRI")}</TableHead>
                      <TableHead>{t("dashboard.col.priority", "Priority")}</TableHead>
                      <TableHead>{t("dashboard.col.captureStatus", "Capture status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.risk_register.top_at_risk.map((row: TopAtRiskEntry) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.role_title}</TableCell>
                        <TableCell>{row.kri.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={PRIORITY_BADGE_CLASS[row.capture_priority]}
                          >
                            {row.capture_priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {row.capture_status.replace(/_/g, " ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
