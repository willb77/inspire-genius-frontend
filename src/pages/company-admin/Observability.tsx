import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Eye,
  Zap,
  Clock,
  Coins,
  Brain,
  AlertTriangle,
  Users,
  RefreshCw,
} from "lucide-react"
import { useDashboardMetrics } from "@/hooks/observability/useObservability"
import { cn } from "@/lib/utils"

export default function CompanyAdminObservability() {
  const { data: metrics, isLoading, refetch } = useDashboardMetrics()

  return (
    <CompanyAdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Eye className="h-6 w-6" />
              AI Observability
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Agent performance and cost metrics for your organization
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Zap className="h-4 w-4" />}
            title="Responses Today"
            value={metrics?.total_responses_today ?? 0}
            loading={isLoading}
          />
          <MetricCard
            icon={<Clock className="h-4 w-4" />}
            title="Avg Latency"
            value={metrics?.avg_latency_ms ? `${Math.round(metrics.avg_latency_ms)}ms` : "—"}
            loading={isLoading}
          />
          <MetricCard
            icon={<Coins className="h-4 w-4" />}
            title="Total Cost"
            value={`$${(metrics?.total_cost_today ?? 0).toFixed(4)}`}
            loading={isLoading}
          />
          <MetricCard
            icon={<Brain className="h-4 w-4" />}
            title="Avg Confidence"
            value={
              metrics?.avg_confidence
                ? `${(metrics.avg_confidence * 100).toFixed(0)}%`
                : "—"
            }
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            title="Unique Users"
            value={metrics?.unique_users_today ?? 0}
            loading={isLoading}
          />
          <MetricCard
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Error Rate"
            value={`${((metrics?.error_rate ?? 0) * 100).toFixed(1)}%`}
            loading={isLoading}
            alert={!!metrics && metrics.error_rate > 0.05}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : metrics?.top_agents && metrics.top_agents.length > 0 ? (
              <div className="space-y-2">
                {metrics.top_agents.map((agent) => (
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
                        agent.avg_confidence >= 0.8
                          ? "bg-green-100 text-green-800"
                          : agent.avg_confidence >= 0.5
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      )}
                    >
                      {(agent.avg_confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No agent data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost by Model Tier</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : metrics?.cost_by_model && metrics.cost_by_model.length > 0 ? (
              <div className="space-y-2">
                {metrics.cost_by_model.map((item) => (
                  <div
                    key={item.model_tier}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                  >
                    <Badge variant="outline" className="text-xs">
                      {item.model_tier?.replace("tier_", "Tier ").replace("_", " ") ?? "Unknown"}
                    </Badge>
                    <span className="font-mono text-sm font-medium">
                      ${item.cost.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No cost data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </CompanyAdminLayout>
  )
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
          <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        ) : (
          <div className={cn("text-2xl font-bold", alert && "text-destructive")}>{value}</div>
        )}
      </CardContent>
    </Card>
  )
}
