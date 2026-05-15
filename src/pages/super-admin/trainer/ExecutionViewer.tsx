import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { useExecution, useExecutionSteps, useApproveStep, useRejectStep } from "@/hooks/trainer/useTrainer"
import { useAuth } from "@/context/useAuth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft, Bot, Clock, DollarSign, Zap, AlertTriangle,
  CheckCircle2, XCircle, Pause, Play, SkipForward, ChevronDown, ChevronRight,
} from "lucide-react"
import type { WorkflowExecution, ExecutionStep } from "@/types/trainer"

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  failed: <XCircle className="h-4 w-4 text-red-600" />,
  running: <Play className="h-4 w-4 text-yellow-600" />,
  pending: <Clock className="h-4 w-4 text-gray-400" />,
  paused: <Pause className="h-4 w-4 text-blue-600" />,
  skipped: <SkipForward className="h-4 w-4 text-gray-400" />,
}

const statusBorder: Record<string, string> = {
  completed: "border-l-green-500",
  failed: "border-l-red-500",
  running: "border-l-yellow-500",
  pending: "border-l-gray-300",
  paused: "border-l-blue-500",
  skipped: "border-l-gray-300",
}

const statusBadgeColor: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  running: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-600",
  paused: "bg-blue-100 text-blue-800",
  skipped: "bg-gray-100 text-gray-500",
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

export default function ExecutionViewer() {
  const { executionId } = useParams<{ executionId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: execResp } = useExecution(executionId || "")
  const { data: stepsResp } = useExecutionSteps(executionId || "")

  const execution: WorkflowExecution | undefined = (execResp as Record<string, unknown>)?.data as WorkflowExecution | undefined
  const steps: ExecutionStep[] = (stepsResp as Record<string, unknown>)?.data as ExecutionStep[] ?? []

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [contextExpanded, setContextExpanded] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const approveMut = useApproveStep()
  const rejectMut = useRejectStep()

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? (steps.length > 0 ? steps[0] : null)

  const handleApprove = () => {
    if (!executionId || !selectedStep) return
    approveMut.mutate({ executionId, stepId: selectedStep.id, approvedBy: user?.email || "unknown" })
  }

  const handleReject = () => {
    if (!executionId || !selectedStep || !rejectReason.trim()) return
    rejectMut.mutate({ executionId, stepId: selectedStep.id, rejectedBy: user?.email || "unknown", reason: rejectReason })
    setRejectReason("")
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin/agent-trainer/executions")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5" /> Execution Trace
            </h1>
            <p className="text-xs text-muted-foreground font-mono">{executionId}</p>
          </div>
          {execution && (
            <Badge className={statusBadgeColor[execution.status]}>{execution.status}</Badge>
          )}
        </div>

        {/* Execution Summary Cards */}
        {execution && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Steps</p>
                <p className="text-lg font-bold">{execution.step_count}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Tokens</p>
                <p className="text-lg font-bold">{execution.total_tokens.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Cost</p>
                <p className="text-lg font-bold">${execution.total_cost_usd.toFixed(4)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-lg font-bold">{formatDuration(execution.total_latency_ms)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Started</p>
                <p className="text-sm font-medium">{execution.started_at ? new Date(execution.started_at).toLocaleTimeString() : "--"}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Trigger Input */}
        {execution?.trigger_input && (
          <Card>
            <CardContent className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Trigger Input</p>
              <p className="text-sm">{execution.trigger_input}</p>
            </CardContent>
          </Card>
        )}

        {/* Two-panel layout: step list + step detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[400px]">
          {/* Left: Step List */}
          <div className="space-y-2 lg:col-span-1">
            <h2 className="text-sm font-semibold text-muted-foreground px-1">Steps ({steps.length})</h2>
            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">No steps found.</p>
            ) : (
              steps
                .sort((a, b) => a.step_index - b.step_index)
                .map((step) => {
                  const isSelected = (selectedStep?.id === step.id)
                  return (
                    <Card
                      key={step.id}
                      className={`cursor-pointer border-l-4 transition-all ${statusBorder[step.status]} ${isSelected ? "ring-2 ring-primary shadow-md" : "hover:shadow-sm"}`}
                      onClick={() => setSelectedStepId(step.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {statusIcon[step.status]}
                            <span className="text-xs text-muted-foreground">#{step.step_index}</span>
                            <span className="text-sm font-medium truncate max-w-[140px]">{step.agent_name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDuration(step.latency_ms)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{step.task_description}</p>
                      </CardContent>
                    </Card>
                  )
                })
            )}
          </div>

          {/* Right: Step Detail */}
          <div className="lg:col-span-2">
            {selectedStep ? (
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      {selectedStep.agent_name}
                      <Badge className={statusBadgeColor[selectedStep.status]}>{selectedStep.status}</Badge>
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">Wave {selectedStep.wave_number} / Step #{selectedStep.step_index}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Task Description */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Task Description</p>
                    <p className="text-sm">{selectedStep.task_description}</p>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Zap className="h-3 w-3" /> Tokens</p>
                      <p className="text-sm font-bold">{(selectedStep.tokens_input + selectedStep.tokens_output).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{selectedStep.tokens_input} in / {selectedStep.tokens_output} out</p>
                    </div>
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><DollarSign className="h-3 w-3" /> Cost</p>
                      <p className="text-sm font-bold">${selectedStep.cost_usd.toFixed(4)}</p>
                    </div>
                    <div className="rounded-md border p-2 text-center">
                      <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> Latency</p>
                      <p className="text-sm font-bold">{formatDuration(selectedStep.latency_ms)}</p>
                    </div>
                  </div>

                  {/* Input Context (collapsible) */}
                  {selectedStep.input_context && (
                    <div>
                      <button
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setContextExpanded(!contextExpanded)}
                      >
                        {contextExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        Input Context
                      </button>
                      {contextExpanded && (
                        <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-auto max-h-48 font-mono">
                          {JSON.stringify(selectedStep.input_context, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Output Text */}
                  {selectedStep.output_text && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                      <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                        {selectedStep.output_text}
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {selectedStep.status === "failed" && selectedStep.error_message && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-medium text-red-700 flex items-center gap-1 mb-1">
                        <AlertTriangle className="h-3 w-3" /> Error
                      </p>
                      <p className="text-sm text-red-800">{selectedStep.error_message}</p>
                    </div>
                  )}

                  {/* HITL Approve / Reject */}
                  {selectedStep.status === "paused" && (
                    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                        <Pause className="h-4 w-4" /> Human-in-the-Loop Review Required
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleApprove}
                          disabled={approveMut.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {approveMut.isPending ? "Approving..." : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleReject}
                          disabled={rejectMut.isPending || !rejectReason.trim()}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {rejectMut.isPending ? "Rejecting..." : "Reject"}
                        </Button>
                      </div>
                      <input
                        type="text"
                        placeholder="Rejection reason (required to reject)"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full rounded-md border px-3 py-2 text-sm"
                      />
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                    {selectedStep.started_at && <span>Started: {new Date(selectedStep.started_at).toLocaleString()}</span>}
                    {selectedStep.completed_at && <span>Completed: {new Date(selectedStep.completed_at).toLocaleString()}</span>}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Select a step to view details</p>
              </Card>
            )}
          </div>
        </div>

        {/* Final Output */}
        {execution?.final_output && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Final Output</p>
              <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">{execution.final_output}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </SuperAdminLayout>
  )
}
