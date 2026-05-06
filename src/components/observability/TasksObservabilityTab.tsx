/**
 * Tasks tab for super-admin Observability (Combined Plan §A.E3.5).
 *
 * Surfaces `tasks.invocation` events emitted by the agent-engine task
 * router (E3.2). The events are stored by the audit-service via its
 * EventBridge consumer; we read them back through the audit-service
 * REST API.
 *
 * Surfaced metrics (per the plan):
 *   - Per-agent invocation count
 *   - Latency P50 / P95 / P99 (from each event's metadata.elapsed_ms)
 *   - Error rate by error_class
 *   - Filter chips for agent (5 options) + outcome (success/error)
 */
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { getAuditLogs } from "@/services/audit/audit.service"
import type { AuditLogEntry } from "@/types/audit"

type Outcome = "all" | "success" | "error"
type Agent = "all" | "maven" | "james" | "atlas" | "forge" | "sage"

const AGENT_LABEL: Record<Exclude<Agent, "all">, string> = {
  maven: "Maven",
  james: "James",
  atlas: "Atlas",
  forge: "Forge",
  sage: "Sage",
}

interface TaskMetrics {
  count: number
  errors: number
  latencies: number[]
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[idx]
}

function aggregate(logs: AuditLogEntry[]): Record<string, TaskMetrics> {
  const buckets: Record<string, TaskMetrics> = {}
  for (const log of logs) {
    const meta = (log.extra_data ?? {}) as Record<string, unknown>
    const agentId = (meta.agent_id ?? log.target_id ?? "unknown") as string
    const success = meta.success !== false
    const elapsed = typeof meta.elapsed_ms === "number" ? meta.elapsed_ms : null
    const bucket = (buckets[agentId] ??= { count: 0, errors: 0, latencies: [] })
    bucket.count += 1
    if (!success) bucket.errors += 1
    if (elapsed !== null) bucket.latencies.push(elapsed)
  }
  return buckets
}

export default function TasksObservabilityTab() {
  const [agent, setAgent] = useState<Agent>("all")
  const [outcome, setOutcome] = useState<Outcome>("all")

  const query = useQuery({
    queryKey: ["task-invocations"],
    queryFn: () =>
      getAuditLogs({ action: "tasks.invocation", limit: 500 }).then(
        (r) => r.data?.logs ?? []
      ),
    refetchOnWindowFocus: false,
  })

  const filtered = useMemo(() => {
    const logs = query.data ?? []
    return logs.filter((log) => {
      const meta = (log.extra_data ?? {}) as Record<string, unknown>
      const agentId = (meta.agent_id ?? log.target_id ?? "") as string
      if (agent !== "all" && agentId !== agent) return false
      if (outcome === "success" && meta.success === false) return false
      if (outcome === "error" && meta.success !== false) return false
      return true
    })
  }, [query.data, agent, outcome])

  const buckets = useMemo(() => aggregate(filtered), [filtered])

  const totalCount = filtered.length
  const totalErrors = Object.values(buckets).reduce((sum, b) => sum + b.errors, 0)
  const errorRate =
    totalCount > 0 ? ((totalErrors / totalCount) * 100).toFixed(1) : "0.0"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-600 mr-2">Agent:</span>
          {(["all", "maven", "james", "atlas", "forge", "sage"] as Agent[]).map((a) => (
            <Badge
              key={a}
              variant={agent === a ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => setAgent(a)}
            >
              {a === "all" ? "All" : AGENT_LABEL[a as Exclude<Agent, "all">]}
            </Badge>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-slate-600 mr-2">Outcome:</span>
        {(["all", "success", "error"] as Outcome[]).map((o) => (
          <Badge
            key={o}
            variant={outcome === o ? "default" : "outline"}
            className="cursor-pointer capitalize"
            onClick={() => setOutcome(o)}
          >
            {o}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Total invocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalErrors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">Error rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{errorRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per-agent breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading && (
            <p className="text-sm text-slate-500">Loading task invocations…</p>
          )}
          {!query.isLoading && Object.keys(buckets).length === 0 && (
            <p className="text-sm text-slate-500">
              No task invocations recorded yet. Trigger a task agent (Maven / James / Atlas
              / Forge / Sage) and refresh — events appear once the audit-service consumes
              the EventBridge event.
            </p>
          )}
          {Object.keys(buckets).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-4">Agent</th>
                    <th className="py-2 pr-4 text-right">Calls</th>
                    <th className="py-2 pr-4 text-right">Errors</th>
                    <th className="py-2 pr-4 text-right">P50 (ms)</th>
                    <th className="py-2 pr-4 text-right">P95 (ms)</th>
                    <th className="py-2 pr-4 text-right">P99 (ms)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(buckets).map(([agentId, b]) => {
                    const sorted = [...b.latencies].sort((a, x) => a - x)
                    return (
                      <tr key={agentId} className="border-b last:border-b-0">
                        <td className="py-2 pr-4 font-medium capitalize">{agentId}</td>
                        <td className="py-2 pr-4 text-right">{b.count}</td>
                        <td className="py-2 pr-4 text-right">{b.errors}</td>
                        <td className="py-2 pr-4 text-right">{Math.round(percentile(sorted, 50))}</td>
                        <td className="py-2 pr-4 text-right">{Math.round(percentile(sorted, 95))}</td>
                        <td className="py-2 pr-4 text-right">{Math.round(percentile(sorted, 99))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
