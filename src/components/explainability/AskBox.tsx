import { useEffect, useRef, useState } from "react"
import { Bot, Loader2, Send, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useAsk, useTurnAsks } from "@/hooks/super-admin/explainability/useExplainability"
import type { AskRecord } from "@/types/explainability/types"

export type AskBoxProps = {
  turnId?: string
  className?: string
}

const MAX_LEN = 2000

export function AskBox({ turnId, className }: AskBoxProps) {
  const [question, setQuestion] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { data: askList, isLoading: isLoadingAsks } = useTurnAsks(turnId)
  const ask = useAsk(turnId)
  const listEndRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to the newest answer.
  useEffect(() => {
    listEndRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" })
  }, [askList?.data?.length, ask.isPending])

  if (!turnId) {
    return (
      <section
        className={cn("flex flex-col gap-2 p-3 text-xs text-muted-foreground", className)}
        data-testid="ask-box-empty"
      >
        Select a turn to ask the Analyzer follow-up questions.
      </section>
    )
  }

  const trimmed = question.trim()
  const submitDisabled = !trimmed || ask.isPending || trimmed.length > MAX_LEN

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!trimmed) {
      setError("Type a question first.")
      return
    }
    try {
      await ask.mutateAsync(trimmed)
      setQuestion("")
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      const status = e.response?.status
      const detail = e.response?.data?.detail
      if (status === 429) {
        setError(detail ?? "Throttle limit reached. Try again later.")
      } else if (status === 404) {
        setError("Turn not found — it may have been deleted.")
      } else if (status === 403) {
        setError("Super-admin role required to ask follow-ups.")
      } else {
        setError(detail ?? "Failed to submit follow-up. Try again.")
      }
    }
  }

  return (
    <section
      className={cn("flex flex-col gap-2 border-t bg-muted/10 p-3", className)}
      data-testid="ask-box"
    >
      <header className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Ask Analyzer</span>
        {ask.data && (
          <span className="text-[10px] text-muted-foreground">
            quota: {ask.data.remaining_hour}/hr · {ask.data.remaining_day}/day
          </span>
        )}
      </header>

      <div
        className="max-h-72 space-y-2 overflow-y-auto rounded border bg-background p-2"
        data-testid="ask-thread"
      >
        {isLoadingAsks && !askList && (
          <p className="text-xs text-muted-foreground">Loading follow-ups…</p>
        )}
        {askList && askList.data.length === 0 && !ask.isPending && (
          <p className="text-xs text-muted-foreground">
            No follow-ups yet. Ask the Analyzer anything about this turn.
          </p>
        )}
        {askList?.data.map((row) => <AskThreadRow key={row.id} row={row} />)}
        {ask.isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Analyzer is thinking…
          </div>
        )}
        <div ref={listEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
        <Textarea
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Why didn't this go to Aura?"
          rows={2}
          maxLength={MAX_LEN}
          className="resize-none text-xs"
          disabled={ask.isPending}
          aria-label="Ask the Analyzer a follow-up question"
        />
        {error && (
          <p className="text-[11px] text-destructive" role="alert">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {trimmed.length}/{MAX_LEN}
          </span>
          <Button type="submit" size="sm" disabled={submitDisabled}>
            {ask.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Send className="size-3" />
            )}
            <span className="ml-1">Ask</span>
          </Button>
        </div>
      </form>
    </section>
  )
}

function AskThreadRow({ row }: { row: AskRecord }) {
  return (
    <Card className="border-muted">
      <CardContent className="space-y-2 p-2 text-xs">
        <div className="flex items-start gap-2">
          <User className="mt-0.5 size-3 text-muted-foreground" />
          <p className="font-medium">{row.question}</p>
        </div>
        <div className="flex items-start gap-2">
          <Bot className="mt-0.5 size-3 text-emerald-600" />
          <pre className="flex-1 whitespace-pre-wrap font-sans text-xs leading-snug text-foreground">
            {row.answer}
          </pre>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="font-mono">{row.model_used}</span>
          <span>·</span>
          <span>${row.cost_usd.toFixed(6)}</span>
          <span>·</span>
          <time dateTime={row.created_at}>
            {new Date(row.created_at).toLocaleString()}
          </time>
        </div>
      </CardContent>
    </Card>
  )
}
