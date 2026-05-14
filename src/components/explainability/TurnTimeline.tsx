import { useNavigate, useParams } from "react-router-dom"
import { ChevronRight, Loader2, MessageCircle, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useConversation } from "@/hooks/super-admin/explainability/useExplainability"
import type {
  AnalysisSection,
  RoutingTrace,
  Section1WhichAgent,
  Section2WhyThisAgent,
  Section3WhatDataWasUsed,
  TurnDetail,
} from "@/types/explainability/types"
import { RoutingTraceBadge } from "./RoutingTraceBadge"

export type TurnTimelineProps = {
  sessionId?: string
  selectedTurnId?: string
  className?: string
}

function findSection<T extends AnalysisSection>(
  turn: TurnDetail,
  title: T["title"]
): T | undefined {
  return turn.sections.find((s) => s.title === title) as T | undefined
}

export function TurnTimeline({ sessionId: propSessionId, selectedTurnId, className }: TurnTimelineProps) {
  const navigate = useNavigate()
  const params = useParams<{ sessionId?: string; turnId?: string }>()
  const sessionId = propSessionId ?? params.sessionId
  const activeTurnId = selectedTurnId ?? params.turnId
  const { data, isLoading, isError } = useConversation(sessionId)

  if (!sessionId) {
    return (
      <section
        className={cn("flex h-full items-center justify-center p-8 text-sm text-muted-foreground", className)}
        data-testid="turn-timeline-empty"
      >
        <p>Select a conversation on the left to inspect its turns.</p>
      </section>
    )
  }

  return (
    <section
      className={cn("flex h-full flex-col overflow-hidden", className)}
      data-testid="explainability-turn-timeline"
    >
      <header className="border-b p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Conversation</p>
        <h2 className="font-mono text-sm">{sessionId}</h2>
        {data?.user_id && (
          <p className="mt-1 text-xs text-muted-foreground">
            user_id <span className="font-mono">{data.user_id}</span>
          </p>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading turns…
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">Failed to load conversation.</p>
        )}
        {data?.turns.length === 0 && (
          <p className="text-sm text-muted-foreground">This conversation has no turns.</p>
        )}
        {data?.turns.map((turn) => {
          const s1 = findSection<Section1WhichAgent>(turn, "Which agent responded")
          const s2 = findSection<Section2WhyThisAgent>(turn, "Why this agent")
          const s3 = findSection<Section3WhatDataWasUsed>(turn, "What data was used")
          const isActive = activeTurnId === turn.turn_id
          const trace: RoutingTrace | null = s2?.routing_trace ?? null
          return (
            <article
              key={turn.turn_id}
              className={cn(
                "rounded-md border bg-card p-3 transition",
                isActive && "ring-2 ring-primary"
              )}
              data-testid={`turn-card-${turn.turn_id}`}
            >
              <header className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {turn.role === "user" ? (
                      <MessageCircle className="size-3.5" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    <span className="font-mono">{turn.turn_id.slice(0, 8)}…</span>
                    <span>{new Date(turn.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {turn.role}
                    </Badge>
                    {s1?.agent_name && (
                      <Badge>{s1.agent_name}</Badge>
                    )}
                    {s1?.synthesized && <Badge variant="outline">synthesized</Badge>}
                    <RoutingTraceBadge trace={trace} />
                    {s3 && (
                      <Badge variant="outline">
                        {s3.source_count} src · {s3.memory_count} mem
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={isActive ? "default" : "ghost"}
                  onClick={() =>
                    navigate(
                      `/super-admin/explainability/c/${sessionId}/t/${turn.turn_id}`
                    )
                  }
                  data-testid={`turn-open-${turn.turn_id}`}
                >
                  Analysis <ChevronRight className="ml-1 size-3.5" />
                </Button>
              </header>
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm">
                {turn.content}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
