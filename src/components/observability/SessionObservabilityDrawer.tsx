import { useState } from "react"
import { Activity, Download, X, Clock, Coins, Brain, Zap, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  useSessionObservability,
  useSessionResponses,
  useExportSession,
} from "@/hooks/observability/useObservability"
import type { ObservabilityExportFormat } from "@/types/observability"

type SessionObservabilityDrawerProps = {
  sessionId: string
  className?: string
}

export default function SessionObservabilityDrawer({
  sessionId,
  className,
}: SessionObservabilityDrawerProps) {
  const [open, setOpen] = useState(false)
  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSessionObservability(sessionId, open)
  const { data: responses, isLoading: responsesLoading, isError: responsesError } = useSessionResponses(sessionId, open)
  const exportMutation = useExportSession()

  const handleExport = (format: ObservabilityExportFormat) => {
    exportMutation.mutate({ sessionId, format })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => setOpen(true)}
      >
        <Activity className="h-3.5 w-3.5" />
        Session Info
      </Button>

      {open && (
        <div
          className={cn(
            "fixed inset-y-0 right-0 z-50 w-96 bg-background border-l shadow-lg flex flex-col",
            className
          )}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-sm">Session Observability</h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sessionLoading ? (
              <div className="text-sm text-muted-foreground">Loading session data...</div>
            ) : sessionError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Couldn't load session data — the observability backend may be unavailable. Try again later.
              </div>
            ) : session ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={<Zap className="h-4 w-4" />}
                    label="Responses"
                    value={session.response_count}
                  />
                  <StatCard
                    icon={<Clock className="h-4 w-4" />}
                    label="Duration"
                    value={`${session.duration_seconds ?? 0}s`}
                  />
                  <StatCard
                    icon={<Brain className="h-4 w-4" />}
                    label="Tokens"
                    value={session.total_tokens.toLocaleString()}
                  />
                  <StatCard
                    icon={<Coins className="h-4 w-4" />}
                    label="Cost"
                    value={`$${session.total_cost_usd.toFixed(4)}`}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Agents Used</div>
                  <div className="flex flex-wrap gap-1">
                    {session.agents_used?.map((a) => (
                      <Badge key={a} variant="outline" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Avg Latency:</span>{" "}
                    {session.avg_latency_ms ?? "—"}ms
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max Latency:</span>{" "}
                    {session.max_latency_ms ?? "—"}ms
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Confidence:</span>{" "}
                    {session.avg_confidence?.toFixed(2) ?? "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">RAG Queries:</span>{" "}
                    {session.rag_queries}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tool Calls:</span>{" "}
                    {session.tool_calls_total}
                  </div>
                  {session.errors > 0 && (
                    <div className="text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {session.errors} errors
                    </div>
                  )}
                </div>

                <div className="border-t pt-3">
                  <div className="text-xs text-muted-foreground mb-2">Response Timeline</div>
                  {responsesLoading ? (
                    <div className="text-xs text-muted-foreground">Loading...</div>
                  ) : responsesError ? (
                    <div className="text-xs text-destructive">
                      Couldn't load response timeline.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {responses?.map((r, i) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">#{i + 1}</span>
                            <span className="font-medium">{r.agent_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>{r.latency_ms}ms</span>
                            <span>{r.total_tokens}tok</span>
                            <Badge
                              className={cn(
                                "text-[10px] h-4",
                                r.confidence >= 0.8
                                  ? "bg-green-100 text-green-800"
                                  : r.confidence >= 0.5
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              )}
                            >
                              {(r.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                No session observability data available
              </div>
            )}
          </div>

          <div className="border-t p-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex-1"
              onClick={() => handleExport("json")}
              disabled={exportMutation.isPending}
            >
              <Download className="h-3 w-3 mr-1" />
              JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex-1"
              onClick={() => handleExport("csv")}
              disabled={exportMutation.isPending}
            >
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs flex-1"
              onClick={() => handleExport("pdf")}
              disabled={exportMutation.isPending}
            >
              <Download className="h-3 w-3 mr-1" />
              PDF
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}
