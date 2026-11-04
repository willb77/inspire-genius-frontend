/**
 * RWO-8 — the résumé assistant (CSA §2.B, option 1).
 *
 * Two kinds of turn, and the person always chooses which:
 *
 * - **Ask** is free. It is ordinary Meridian chat over `useMeridianChat`
 *   (`POST /v1/agents/chat/async`, never the WebSocket — agents.md §6), with
 *   `context = { surface: "resume_writer", resume_draft }`. The server grounds the
 *   turn in that summary, fenced, on the caller's own turn only. Ask never edits
 *   the draft.
 * - **Apply** costs one draft and is always a click: "Apply to my draft (uses 1 of
 *   N)" under the person's own message sends it, capped at 300 characters, as the
 *   draft's `instruction`. The fabrication check still runs, so a direction to add
 *   something the résumé doesn't show produces a removed line, not a claim.
 *
 * The hook's `error` is rendered (`role="alert"`): a panel that cannot say "that
 * failed" is indistinguishable from one that is slow.
 */
import { useEffect, useRef, useState } from "react"
import { Loader2, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMeridianChat } from "@/hooks/agents/useMeridianChat"
import { cn } from "@/lib/utils"
import { INSTRUCTION_MAX } from "@/lib/resume/guided/choices"

const SUGGESTIONS = [
  "Why were some lines left out?",
  "Make it one page",
  "Use the job posting's words",
  "What should I add?",
]

type Turn = { id: number; role: "user" | "assistant"; content: string }

export function ResumeAssistant({
  summary,
  accessToken,
  left,
  limit,
  applying,
  canApply,
  showApply,
  onApply,
  pendingAsk,
  onPendingAskUsed,
  prefill,
}: {
  /** The draft summary, sent as `resume_draft` (the server caps and fences it). */
  summary: string
  accessToken?: string
  left: number
  limit: number
  applying: boolean
  /** False before a draft exists, or with no drafts left today. */
  canApply: boolean
  /** False before a draft exists: there is nothing to apply a change to yet. */
  showApply: boolean
  onApply: (instruction: string) => void
  /** A question handed over from elsewhere on the page ("Not sure what you mean?"). */
  pendingAsk?: string | null
  onPendingAskUsed?: () => void
  /**
   * Text put in the box from a clicked review line, NOT sent: the person reads,
   * finishes and sends it. A new object per click, so the same line twice works.
   */
  prefill?: { text: string } | null
}) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [text, setText] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const { send, isProcessing, partial, error, clearError } = useMeridianChat({
    sessionKey: "resume-writer",
    accessToken,
    context: { surface: "resume_writer", resume_draft: summary },
    onAssistant: (content) => setTurns((t) => [...t, { id: t.length + 1, role: "assistant", content }]),
  })

  const ask = (message: string) => {
    const trimmed = message.trim()
    if (!trimmed || isProcessing) return
    clearError()
    setTurns((t) => [...t, { id: t.length + 1, role: "user", content: trimmed }])
    setText("")
    void send(trimmed)
  }

  useEffect(() => {
    if (!prefill) return
    setText(prefill.text)
    const input = inputRef.current
    if (input) {
      input.focus()
      input.setSelectionRange(prefill.text.length, prefill.text.length)
    }
  }, [prefill])

  useEffect(() => {
    // Handed over once: ask it, then let the page forget it.
    if (!pendingAsk) return
    ask(pendingAsk)
    onPendingAskUsed?.()
    // Only a new hand-over should ask; `ask` changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAsk])

  return (
    <section aria-label="Résumé assistant" className="flex flex-col gap-3 rounded-lg border p-4" data-testid="resume-assistant">
      <div>
        <h3 className="text-sm font-semibold">Résumé assistant</h3>
        <p className="text-xs text-muted-foreground">
          Ask why something is or isn&apos;t there, or tell it what to change. Questions are free.
        </p>
      </div>
      <ol className="flex max-h-96 flex-col gap-2 overflow-y-auto" aria-live="polite">
        {turns.map((t) => (
          <li key={t.id} className={cn("flex flex-col gap-1", t.role === "user" ? "items-end" : "items-start")}>
            <p
              className={cn(
                "max-w-[92%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm",
                t.role === "user" ? "bg-teal-700 text-white" : "bg-muted",
              )}
            >
              {t.content}
            </p>
            {t.role === "user" && showApply ? (
              <Button
                size="sm"
                variant="outline"
                disabled={!canApply || applying}
                onClick={() => onApply(t.content.slice(0, INSTRUCTION_MAX))}
                data-testid="resume-assistant-apply"
              >
                {applying ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
                )}
                Apply to my draft (uses 1 of {left} left of {limit})
              </Button>
            ) : null}
          </li>
        ))}
        {isProcessing ? (
          <li className="text-sm text-muted-foreground" role="status">
            {partial || "Thinking…"}
          </li>
        ) : null}
      </ol>
      {error ? (
        <div role="alert" data-testid="resume-assistant-error" className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            disabled={isProcessing}
            className="min-h-9 rounded-full border px-3 text-xs hover:bg-muted/50 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          ask(text)
        }}
      >
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask, or say what to change"
          aria-label="Ask or give direction"
        />
        <Button type="submit" size="icon" aria-label="Send" disabled={isProcessing || !text.trim()}>
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
      {showApply && left <= 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="resume-assistant-no-apply">
          Applying a change needs one of today&apos;s drafts — you have none left. Questions still work.
        </p>
      ) : null}
    </section>
  )
}
