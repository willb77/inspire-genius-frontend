import { useNavigate } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useExecutions, useExecutionStats } from "@/hooks/trainer/useTrainer"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Activity, CheckCircle2, XCircle, Clock, DollarSign, BarChart3, ArrowLeft,
} from "lucide-react"
import type { WorkflowExecution, ExecutionStats } from "@/types/trainer"

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  running: "secondary",
  failed: "destructive",
  pending: "outline",
  paused: "outline",
}

const statusColor: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  running: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-600",
  paused: "bg-blue-100 text-blue-800",
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

export default function ExecutionList() {
  const navigate = useNavigate()
  const { data: execResp, isLoading } = useExecutions()
  const { data: statsResp } = useExecutionStats()

  const executions: WorkflowExecution[] = (execResp as Record<string, unknown>)?.data as WorkflowExecution[] ?? []
  const stats: ExecutionStats | undefined = (statsResp as Record<string, unknown>)?.data as ExecutionStats | undefined

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin/agent-trainer/workflows")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" /> Workflow Executions
            </h1>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Total Executions</p>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">{stats?.total_executions ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">{stats?.success_rate != null ? `${(stats.success_rate * 100).toFixed(1)}%` : "--"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Avg Cost</p>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">${stats?.avg_cost_usd?.toFixed(4) ?? "0.00"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Avg Duration</p>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-1">{stats?.avg_duration_ms != null ? formatDuration(stats.avg_duration_ms) : "--"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Executions Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading executions...</div>
            ) : executions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No executions found. Run a workflow to see results here.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Steps</th>
                      <th className="text-left p-3 font-medium">Tokens</th>
                      <th className="text-left p-3 font-medium">Cost</th>
                      <th className="text-left p-3 font-medium">Duration</th>
                      <th className="text-left p-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executions.map((exec) => (
                      <tr
                        key={exec.id}
                        className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/super-admin/agent-trainer/executions/${exec.id}`)}
                      >
                        <td className="p-3 font-mono text-xs">{exec.id.slice(0, 8)}...</td>
                        <td className="p-3">
                          <Badge variant={statusVariant[exec.status] ?? "outline"} className={statusColor[exec.status]}>
                            {exec.status}
                          </Badge>
                        </td>
                        <td className="p-3">{exec.step_count}</td>
                        <td className="p-3">{exec.total_tokens.toLocaleString()}</td>
                        <td className="p-3">${exec.total_cost_usd.toFixed(4)}</td>
                        <td className="p-3">{formatDuration(exec.total_latency_ms)}</td>
                        <td className="p-3 text-muted-foreground">{new Date(exec.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Failed Agents */}
        {stats?.most_failed_agents && stats.most_failed_agents.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" /> Most Failed Agents
              </h3>
              <div className="space-y-2">
                {stats.most_failed_agents.map((a) => (
                  <div key={a.agent_id} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">{a.agent_id}</span>
                    <Badge variant="destructive">{a.failure_count} failures</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminLayout>
  )
}
