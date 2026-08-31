import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Zap, Clock, Brain, Users, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePlatformObservability } from "@/hooks/observability-board/usePlatformObservability"
import { useOrgObservability } from "@/hooks/observability-board/useOrgObservability"
import type { ObservabilityBoardResult } from "@/hooks/observability-board/usePlatformObservability"

export type ObservabilityBoardScope = "platform" | "org"

export type ObservabilityBoardProps = {
  scope: ObservabilityBoardScope
  /** Optional scope-id (org_id) — passed through to the scope-specific hook. */
  scopeId?: string
  className?: string
}

// The previous copy read "…values may be empty until R-2.4 closes". R-2.4
// closed on 2026-05-11 (REMAINING_TASKS.md), so for over a year this banner
// blamed an empty board on a task that was already finished — sending anyone
// investigating quiet metrics after a non-existent pipeline problem.
const DATA_PENDING_MESSAGE =
  "No agent activity recorded today. Telemetry is live — the agent-engine writes one row per LLM call — so this is a genuinely quiet window rather than a pipeline that has not been switched on."

function DataPendingBanner() {
  return (
    <div
      data-testid="observability-board-data-pending-banner"
      role="status"
      className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2 mb-4"
    >
      <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
      <span className="text-[12px] text-amber-800 font-medium leading-snug">
        {DATA_PENDING_MESSAGE}
      </span>
    </div>
  )
}

function useObservabilityByScope(
  scope: ObservabilityBoardScope,
  scopeId?: string,
): ObservabilityBoardResult {
  // Hooks must be called unconditionally; pick the result by scope.
  const platform = usePlatformObservability()
  const org = useOrgObservability(scope === "org" ? scopeId : undefined)
  return scope === "platform" ? platform : org
}

function MetricCard({
  icon,
  title,
  value,
  loading,
  alert,
}: {
  icon: React.ReactNode
  title: string
  value: string | number
  loading: boolean
  alert?: boolean
}) {
  return (
    <Card className={cn(alert && "border-destructive")}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
          {icon}
          {title}
        </div>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className={cn("text-2xl font-bold", alert && "text-destructive")}>{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default function ObservabilityBoard({
  scope,
  scopeId,
  className,
}: ObservabilityBoardProps) {
  const { data, hasData, isLoading, error } = useObservabilityByScope(scope, scopeId)
  // `!error` here meant the explanatory banner vanished at exactly the moment
  // it was needed: on a failed request the panel rendered a bare grid of 0 / —
  // / 0.0% with nothing to say the numbers were never fetched. A zero that
  // means "the call failed" is indistinguishable from a genuine quiet day, so
  // the failure is now surfaced in its own right.
  const showBanner = !hasData && !isLoading && !error
  const showError = Boolean(error) && !isLoading
  const { kpis, topAgents } = data
  const errorRatePct = (kpis.errorRate * 100).toFixed(1)

  return (
    <div className={cn("space-y-4", className)} data-testid={`observability-board-${scope}`}>
      {showBanner && <DataPendingBanner />}
      {showError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          <span className="text-[12px] font-medium leading-snug text-red-800">
            Could not load these figures. The values below are placeholders, not
            measurements — treat them as unknown rather than as zero.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          title="Responses Today"
          value={kpis.totalResponsesToday}
          loading={isLoading}
        />
        <MetricCard
          icon={<Clock className="h-4 w-4" />}
          title="Avg Latency"
          value={kpis.avgLatencyMs ? `${Math.round(kpis.avgLatencyMs)}ms` : "—"}
          loading={isLoading}
        />
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          title="Unique Users"
          value={kpis.uniqueUsersToday}
          loading={isLoading}
        />
        <MetricCard
          icon={<Brain className="h-4 w-4" />}
          title="Avg Confidence"
          value={
            kpis.avgConfidence != null
              ? `${(kpis.avgConfidence * 100).toFixed(0)}%`
              : "—"
          }
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Error Rate"
          value={`${errorRatePct}%`}
          loading={isLoading}
          alert={kpis.errorRate > 0.05}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Agents by Usage</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : topAgents.length > 0 ? (
            <div className="space-y-2">
              {topAgents.map((agent) => (
                <div
                  key={agent.agent}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{agent.agent}</span>
                    <Badge variant="secondary" className="text-xs">
                      {agent.count} responses
                    </Badge>
                  </div>
                  <Badge
                    className={cn(
                      "text-xs",
                      agent.avgConfidence >= 0.8
                        ? "bg-green-100 text-green-800"
                        : agent.avgConfidence >= 0.5
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800",
                    )}
                  >
                    {(agent.avgConfidence * 100).toFixed(0)}% confidence
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No agent data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
