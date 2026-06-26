import { useState } from "react"
import { ChevronDown, ChevronUp, Download, Brain, Clock, Zap, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useResponseObservability, useExportResponse } from "@/hooks/observability/useObservability"
import { useAuth } from "@/context/useAuth"
import { OBSERVABILITY_FIELDS_BY_ROLE } from "@/types/observability"
import type { ObservabilityExportFormat } from "@/types/observability"

type ObservabilityPanelProps = {
  messageId: string
  className?: string
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.8
      ? "bg-green-100 text-green-800"
      : confidence >= 0.5
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800"
  const label =
    confidence >= 0.8 ? "High" : confidence >= 0.5 ? "Moderate" : "Low"

  return (
    <Badge className={cn("text-xs font-medium", color)}>
      {label} ({(confidence * 100).toFixed(0)}%)
    </Badge>
  )
}

export default function ObservabilityPanel({ messageId, className }: ObservabilityPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const { user } = useAuth()
  const role = (user?.role ?? "user") as keyof typeof OBSERVABILITY_FIELDS_BY_ROLE
  const { data, isLoading, isError } = useResponseObservability(messageId, expanded)
  const exportMutation = useExportResponse()

  const allowedFields = OBSERVABILITY_FIELDS_BY_ROLE[role]
  const canSee = (field: string) =>
    allowedFields === "all" || (Array.isArray(allowedFields) && allowedFields.includes(field))

  const handleExport = (format: ObservabilityExportFormat) => {
    exportMutation.mutate({ messageId, format })
  }

  if (role === "user" && !canSee("confidence")) return null

  return (
    <div className={cn("mt-1", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Brain className="h-3 w-3" />
        <span>Observability</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-xs space-y-2">
          {isLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : data ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {canSee("confidence") && <ConfidenceBadge confidence={data.confidence} />}
                {canSee("agent_name") && (
                  <Badge variant="outline">{data.agent_name}</Badge>
                )}
                {canSee("domain") && data.domain && (
                  <Badge variant="secondary">{data.domain}</Badge>
                )}
              </div>

              {canSee("contributing_agents") &&
                data.contributing_agents &&
                data.contributing_agents.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-xs text-muted-foreground">Agents:</span>
                    {data.contributing_agents.map((a) => (
                      <Badge key={a} variant="outline" className="text-xs">
                        {a}
                      </Badge>
                    ))}
                  </div>
                )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {canSee("latency_ms") && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{data.latency_ms}ms</span>
                  </div>
                )}
                {canSee("ttft_ms") && data.ttft_ms != null && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>TTFT {data.ttft_ms}ms</span>
                  </div>
                )}
                {canSee("model_tier") && (
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-muted-foreground" />
                    <span>{data.model_tier?.replace("tier_", "T")}</span>
                  </div>
                )}
                {canSee("rag_enabled") && (
                  <div className="flex items-center gap-1">
                    <Database className="h-3 w-3 text-muted-foreground" />
                    <span>
                      RAG {data.rag_enabled ? `(${data.rag_chunks_retrieved} chunks)` : "off"}
                    </span>
                  </div>
                )}
                {canSee("input_tokens") && (
                  <div>
                    Tokens: {data.input_tokens} in / {data.output_tokens} out
                  </div>
                )}
                {canSee("estimated_cost_usd") && (
                  <div>Cost: ${data.estimated_cost_usd.toFixed(4)}</div>
                )}
                {canSee("tools_called") && data.tools_called && data.tools_called.length > 0 && (
                  <div>Tools: {data.tools_called.join(", ")}</div>
                )}
                {canSee("memory_accessed") && data.memory_accessed && (
                  <div>Memory: {data.memory_items_loaded} items</div>
                )}
                {canSee("error_occurred") && data.error_occurred && (
                  <div className="text-destructive col-span-full">
                    Error: {data.error_message}
                  </div>
                )}
              </div>

              {(canSee("model_id") || canSee("estimated_cost_usd")) && (
                <div className="flex gap-1 pt-1 border-t">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => handleExport("json")}
                    disabled={exportMutation.isPending}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={() => handleExport("csv")}
                    disabled={exportMutation.isPending}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    CSV
                  </Button>
                </div>
              )}
            </>
          ) : isError ? (
            <div className="text-destructive">
              Couldn't load observability data — the backend may be unavailable.
            </div>
          ) : (
            <div className="text-muted-foreground">No observability data available</div>
          )}
        </div>
      )}
    </div>
  )
}
