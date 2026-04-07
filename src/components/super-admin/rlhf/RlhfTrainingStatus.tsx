import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRlhfModels } from "@/hooks/rlhf/useRlhfModels"
import { Activity, Clock, Loader2, CheckCircle } from "lucide-react"
import type { RlhfModelRecord } from "@/types/rlhf"

function getActiveModel(models: RlhfModelRecord[]): RlhfModelRecord | null {
  return models.find((m) => m.status === "active") ?? null
}

function getLatestTraining(models: RlhfModelRecord[]): RlhfModelRecord | null {
  return models.find((m) => m.status === "training") ?? null
}

function getLatestApproved(models: RlhfModelRecord[]): RlhfModelRecord | null {
  return models.find((m) => m.status === "approved") ?? null
}

export default function RlhfTrainingStatus() {
  const { data, isLoading } = useRlhfModels()
  const models = data?.data?.models ?? []

  const activeModel = getActiveModel(models)
  const trainingModel = getLatestTraining(models)
  const latestApproved = getLatestApproved(models)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Training Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Model */}
        <div className="flex items-start gap-3">
          <div className="bg-green-50 p-2 rounded-lg">
            <CheckCircle className="size-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Active Model</p>
            {activeModel ? (
              <div className="text-xs text-muted-foreground">
                <span className="font-mono">{activeModel.version}</span>
                {activeModel.metrics && (
                  <span> — Acc: {(activeModel.metrics.accuracy * 100).toFixed(1)}%</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No active model</p>
            )}
          </div>
        </div>

        {/* In-Progress Training */}
        <div className="flex items-start gap-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Activity className="size-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Current Training</p>
            {trainingModel ? (
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>
                  <span className="font-mono">{trainingModel.version}</span>
                  <Badge variant="secondary" className="ml-2 text-[10px]">Training</Badge>
                </p>
                {trainingModel.train_records != null && (
                  <p>{trainingModel.train_records} records — {trainingModel.train_split} train / {trainingModel.val_split} validation</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No training in progress</p>
            )}
          </div>
        </div>

        {/* Latest Approved (ready to deploy) */}
        <div className="flex items-start gap-3">
          <div className="bg-amber-50 p-2 rounded-lg">
            <Clock className="size-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Ready to Deploy</p>
            {latestApproved ? (
              <div className="text-xs text-muted-foreground">
                <span className="font-mono">{latestApproved.version}</span>
                {latestApproved.approved_by && (
                  <span> — by {latestApproved.approved_by}</span>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No approved models pending deployment</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="border-t pt-3 flex gap-4 text-xs text-muted-foreground">
          <span>Total models: {models.length}</span>
          <span>Approved: {models.filter((m) => m.status === "approved" || m.status === "active").length}</span>
          <span>Pending: {models.filter((m) => m.status === "pending").length}</span>
        </div>
      </CardContent>
    </Card>
  )
}
