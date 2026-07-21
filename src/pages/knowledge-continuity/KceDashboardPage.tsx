import type { ReactNode } from "react"
import {
  BookOpenCheck,
  Gauge,
  Layers,
  Clock,
  Inbox,
  GraduationCap,
  AlertTriangle,
} from "lucide-react"
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
import type { CapturePriority, TopAtRiskEntry } from "@/types/knowledge-continuity"

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

const VALIDITY_LABELS: Record<keyof typeof VALIDITY_BADGE_CLASS, string> = {
  validated: "Validated",
  provisional: "Provisional",
  needs_review: "Needs review",
  deprecated: "Deprecated",
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

/**
 * Knowledge Continuity vertical landing page — the Program-Health dashboard.
 * Renders inside the shared AppShell via KceLayout. Summarizes how much
 * expert knowledge has been captured, how fresh it is, and which roles are
 * most at risk of walking out the door uncaptured. Deliberately plain
 * language — no raw PRISM dimension names surfaced here.
 */
export default function KceDashboardPage() {
  const { data: analytics, isLoading, isError } = useContinuityAnalytics()

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <BookOpenCheck className="h-5 w-5 text-[#127A8A]" />
          Program Health
        </h1>
        <p className="text-sm text-muted-foreground">
          Capture progress, freshness, and knowledge-at-risk across the org.
        </p>
      </div>

      {isLoading && <StatCardSkeletons />}

      {!isLoading && isError && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            We couldn't load Program Health right now. Try again shortly.
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && !analytics && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No knowledge-capture activity yet. Once sessions are scheduled,
            program health will show up here.
          </CardContent>
        </Card>
      )}

      {!isLoading && analytics && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              icon={<Gauge className="h-4 w-4" />}
              label="Mean KVI"
              value={formatPct(analytics.mean_kvi, 0)}
              hint="knowledge validity index"
            />
            <StatCard
              icon={<Layers className="h-4 w-4" />}
              label="Coverage"
              value={`${analytics.coverage.nodes_with_units}/${analytics.coverage.taxonomy_nodes_total} nodes`}
              hint={`${analytics.coverage.units_total} units captured`}
            />
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="Currency"
              value={formatPct(analytics.currency.pct_fresh, 0)}
              hint="of captured knowledge is fresh"
            />
            <StatCard
              icon={<Inbox className="h-4 w-4" />}
              label="Review backlog"
              value={
                analytics.review_queue.pending_approvals +
                analytics.review_queue.unresolved_contradictions
              }
              hint={`${analytics.review_queue.pending_approvals} pending, ${analytics.review_queue.unresolved_contradictions} contradictions`}
            />
            <StatCard
              icon={<GraduationCap className="h-4 w-4" />}
              label="Curricula"
              value={analytics.curricula.count}
              hint="published from captured knowledge"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Currency of captured knowledge</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={(analytics.currency.pct_fresh ?? 0) * 100} />
              <p className="text-xs text-muted-foreground">
                {analytics.currency.fresh_units} fresh · {analytics.currency.stale_units} stale
                (freshness window: {analytics.fresh_days} days)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validity of captured knowledge</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {(Object.keys(VALIDITY_LABELS) as (keyof typeof VALIDITY_LABELS)[]).map(
                  (band) => (
                    <div key={band} className="flex items-center gap-2">
                      <Badge variant="outline" className={VALIDITY_BADGE_CLASS[band]}>
                        {VALIDITY_LABELS[band]}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">
                        {analytics.validity_bands[band]}
                      </span>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Knowledge at risk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.risk_register.uncaptured_urgent > 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {analytics.risk_register.uncaptured_urgent} urgent{" "}
                  {analytics.risk_register.uncaptured_urgent === 1 ? "role has" : "roles have"}{" "}
                  not been captured yet.
                </div>
              )}

              {analytics.risk_register.top_at_risk.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No roles currently flagged as at risk.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>KRI</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Capture status</TableHead>
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
