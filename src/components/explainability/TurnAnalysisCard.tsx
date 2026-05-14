import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useTurn } from "@/hooks/super-admin/explainability/useExplainability"
import type {
  AnalysisSection,
  Section1WhichAgent,
  Section2WhyThisAgent,
  Section3WhatDataWasUsed,
  Section4Risks,
  Section5Design,
  TurnDetail,
} from "@/types/explainability/types"
import { SourceProvenanceTag } from "./SourceProvenanceTag"
import { RoutingTraceBadge } from "./RoutingTraceBadge"

export type TurnAnalysisCardProps = {
  turnId?: string
  className?: string
}

function findSection<T extends AnalysisSection>(
  turn: TurnDetail,
  title: T["title"]
): T | undefined {
  return turn.sections.find((s) => s.title === title) as T | undefined
}

export function TurnAnalysisCard({ turnId, className }: TurnAnalysisCardProps) {
  const { data, isLoading, isError } = useTurn(turnId)

  if (!turnId) {
    return (
      <aside
        className={cn(
          "flex h-full items-center justify-center border-l p-6 text-sm text-muted-foreground",
          className
        )}
        data-testid="turn-analysis-empty"
      >
        <p>Select a turn to view its 5-section analysis.</p>
      </aside>
    )
  }

  if (isLoading || !data) {
    return (
      <aside
        className={cn("flex h-full items-center justify-center border-l p-6", className)}
        data-testid="turn-analysis-loading"
      >
        {isError ? (
          <p className="text-sm text-destructive">Failed to load turn analysis.</p>
        ) : (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        )}
      </aside>
    )
  }

  const s1 = findSection<Section1WhichAgent>(data, "Which agent responded")
  const s2 = findSection<Section2WhyThisAgent>(data, "Why this agent")
  const s3 = findSection<Section3WhatDataWasUsed>(data, "What data was used")
  const s4 = findSection<Section4Risks>(data, "Where it could go wrong")
  const s5 = findSection<Section5Design>(data, "What the design intended")

  return (
    <aside
      className={cn("flex h-full flex-col gap-3 overflow-y-auto border-l bg-muted/20 p-4", className)}
      data-testid="turn-analysis-card"
    >
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Turn analysis</p>
        <h2 className="font-mono text-xs">{data.turn_id}</h2>
        {data.agent_name && <Badge>{data.agent_name}</Badge>}
      </header>

      {/* Section 1 — Which agent responded */}
      {s1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">1. {s1.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Displayed agent:</span>{" "}
              <span className="font-medium">{s1.agent_name}</span>
            </div>
            {s1.contributing_agents.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Contributing:</span>
                {s1.contributing_agents.map((a) => (
                  <Badge key={a} variant="secondary">
                    {a}
                  </Badge>
                ))}
              </div>
            )}
            {s1.synthesized && (
              <p className="text-xs text-muted-foreground">
                Output was synthesised by Meridian before delivery.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 2 — Why this agent */}
      {s2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">2. {s2.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <RoutingTraceBadge trace={s2.routing_trace} />
            <p className="text-xs text-muted-foreground">{s2.summary}</p>
            {s2.template_id && (
              <div className="text-xs">
                <span className="text-muted-foreground">Template:</span>{" "}
                <span className="font-mono">{s2.template_id}</span>
              </div>
            )}
            {s2.routing_trace?.reason && (
              <p className="rounded bg-muted/40 p-2 text-xs italic">
                “{s2.routing_trace.reason}”
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 3 — What data was used */}
      {s3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">3. {s3.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{s3.source_count} sources</span>
              <span>{s3.memory_count} memory entries</span>
              {s3.file_ids.length > 0 && <span>{s3.file_ids.length} file ids</span>}
            </div>
            {s3.rag_sources.length > 0 && (
              <div>
                <p className="text-xs font-medium">RAG sources</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {s3.rag_sources.map((src, i) => (
                    <SourceProvenanceTag key={`${src.document_id}-${i}`} source={src} />
                  ))}
                </div>
              </div>
            )}
            {s3.memory_recall.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-medium">Memory recall</p>
                  <ul className="mt-1 space-y-1 text-xs">
                    {s3.memory_recall.map((m, i) => (
                      <li
                        key={i}
                        className="rounded border bg-background p-2"
                      >
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          {m.tier && <Badge variant="outline">{m.tier}</Badge>}
                          {m.session_id && (
                            <span className="font-mono">{m.session_id.slice(0, 8)}…</span>
                          )}
                          {m.age_seconds !== undefined && (
                            <span>{Math.round(m.age_seconds / 60)}m ago</span>
                          )}
                        </div>
                        {m.content && <p className="mt-1 line-clamp-2">{m.content}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 4 — Risks */}
      {s4 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              {s4.ok ? (
                <CheckCircle2 className="size-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="size-4 text-amber-600" />
              )}
              4. {s4.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {s4.flags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No risk flags detected on this turn.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {s4.flags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-3 text-amber-600" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 5 — Design intent */}
      {s5 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">5. {s5.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{s5.agent_role}</p>
            <div className="flex flex-wrap gap-1 text-xs">
              <Badge variant="outline">domain: {s5.agent_domain}</Badge>
              <Badge variant="outline">access: {s5.agent_access}</Badge>
              {s5.template_id && (
                <Badge variant="outline">template: {s5.template_id}</Badge>
              )}
            </div>
            <p className="pt-1 text-xs italic text-muted-foreground">{s5.note}</p>
          </CardContent>
        </Card>
      )}
    </aside>
  )
}
