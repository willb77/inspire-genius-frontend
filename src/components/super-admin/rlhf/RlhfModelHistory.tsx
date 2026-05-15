import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRlhfModels, useApproveRlhfModel } from "@/hooks/rlhf/useRlhfModels"
import { useAuth } from "@/context/useAuth"
import { CheckCircle, Clock, Loader2, XCircle, Cpu, ShieldCheck } from "lucide-react"
import type { RlhfModelRecord } from "@/types/rlhf"

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Pending Review", variant: "outline", icon: Clock },
  training: { label: "Training", variant: "secondary", icon: Loader2 },
  evaluating: { label: "Evaluating", variant: "secondary", icon: Cpu },
  approved: { label: "Approved", variant: "default", icon: CheckCircle },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  active: { label: "Active", variant: "default", icon: ShieldCheck },
}

function ModelStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}

function MetricsDisplay({ metrics }: { metrics: RlhfModelRecord["metrics"] }) {
  if (!metrics) return <span className="text-muted-foreground text-xs">No metrics</span>
  return (
    <div className="flex gap-3 text-xs text-muted-foreground">
      <span>Acc: {(metrics.accuracy * 100).toFixed(1)}%</span>
      <span>Reward: {metrics.avg_reward.toFixed(3)}</span>
      <span>Records: {metrics.total_records}</span>
    </div>
  )
}

export default function RlhfModelHistory() {
  const { data, isLoading } = useRlhfModels()
  const approveModel = useApproveRlhfModel()
  const { user } = useAuth()

  const models = data?.data?.models ?? []

  const handleApprove = (modelId: string) => {
    approveModel.mutate({
      modelId,
      payload: { approved_by: user?.email ?? "super-admin" },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Model History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : models.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No models registered yet.</p>
        ) : (
          <div className="space-y-3">
            {models.map((m: RlhfModelRecord) => (
              <div
                key={m.model_id}
                className="flex items-center justify-between border rounded-lg px-4 py-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{m.version}</span>
                    <ModelStatusBadge status={m.status} />
                  </div>
                  <MetricsDisplay metrics={m.metrics} />
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(m.created_at).toLocaleDateString()}
                    {m.approved_by && ` — Approved by ${m.approved_by}`}
                    {m.train_records != null && ` — ${m.train_records} records`}
                  </div>
                </div>
                {(m.status === "pending" || m.status === "evaluating") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApprove(m.model_id)}
                    disabled={approveModel.isPending}
                  >
                    {approveModel.isPending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      "Approve"
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
