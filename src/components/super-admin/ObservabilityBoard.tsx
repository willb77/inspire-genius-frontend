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

const DATA_PENDING_MESSAGE =
  "Observability telemetry is enabled but the audit-service EventBridge pipeline is still being verified — values may be empty until R-2.4 closes."

// TODO(R-2.4): remove banner in Wave 3 once telemetry populates. Same gating
// as CostBoard — see REMAINING_TASKS.md §4 (R-2.4 closure).
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
  const showBanner = !hasData && !isLoading && !error
  const { kpis, topAgents } = data
  const errorRatePct = (kpis.errorRate * 100).toFixed(1)

  return (
    <div className={cn("space-y-4", className)} data-testid={`observability-board-${scope}`}>
      {showBanner && <DataPendingBanner />}

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
