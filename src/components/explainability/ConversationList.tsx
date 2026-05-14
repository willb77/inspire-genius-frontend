import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Loader2, MessageSquare, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useConversations } from "@/hooks/super-admin/explainability/useExplainability"
import { HealthBadge } from "./RoutingTraceBadge"

export type ConversationListProps = {
  selectedSessionId?: string
  className?: string
}

export function ConversationList({ selectedSessionId, className }: ConversationListProps) {
  const navigate = useNavigate()
  const params = useParams<{ sessionId?: string }>()
  const activeId = selectedSessionId ?? params.sessionId

  const [page, setPage] = useState(1)
  const [agent, setAgent] = useState("")
  const [userId, setUserId] = useState("")

  const { data, isLoading, isError, refetch } = useConversations({
    page,
    limit: 25,
    agent: agent.trim() || undefined,
    user_id: userId.trim() || undefined,
  })

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-card text-card-foreground",
        className
      )}
      data-testid="explainability-conversation-list"
    >
      <header className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Conversations</h2>
          {data?.total !== undefined && (
            <Badge variant="outline">{data.total}</Badge>
          )}
        </div>
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={agent}
              onChange={(e) => {
                setAgent(e.target.value)
                setPage(1)
              }}
              placeholder="Filter by agent (e.g. James)"
              className="pl-7 text-sm"
              aria-label="Filter by agent"
            />
          </div>
          <Input
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value)
              setPage(1)
            }}
            placeholder="Filter by user id"
            className="text-sm"
            aria-label="Filter by user id"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading conversations…
          </div>
        )}
        {isError && (
          <div className="space-y-2 p-4 text-sm text-destructive">
            <p>Failed to load conversations.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}
        {data && data.data.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No conversations match these filters.</p>
        )}
        <ul className="divide-y" role="list">
          {data?.data.map((row) => {
            const isActive = activeId === row.session_id
            return (
              <li key={row.session_id}>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/super-admin/explainability/c/${row.session_id}`)
                  }
                  className={cn(
                    "flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-accent",
                    isActive && "bg-accent"
                  )}
                  data-testid={`conversation-row-${row.session_id}`}
                  aria-current={isActive ? "true" : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono text-xs">
                        {row.session_id.slice(0, 8)}…
                      </span>
                    </div>
                    <HealthBadge health={row.routing_health} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{row.message_count} msg</span>
                    <span>{new Date(row.last_seen_at).toLocaleString()}</span>
                  </div>
                  {row.agents_involved.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.agents_involved.slice(0, 4).map((a) => (
                        <Badge
                          key={a.name}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {a.name} · {a.turn_count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {data && data.pages > 1 && (
        <footer className="flex items-center justify-between border-t p-2 text-xs">
          <Button
            size="sm"
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </Button>
          <span className="text-muted-foreground">
            page {data.page} / {data.pages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </footer>
      )}
    </aside>
  )
}
