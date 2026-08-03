/**
 * Summit — the directed goal-setting interview.
 *
 * Replaces the free-text `MeridianPanel` on the Summit surface. That panel
 * posted whatever was typed at `/v1/agents/chat/async` and relied on intent
 * classification landing on the Summit specialist; this one drives the
 * structured routes directly, because the interview is deterministic — a known
 * category, a known question within it, a known rung of the WHY ladder. See
 * `useSummitInterview` for the loop itself.
 *
 * **Chrome is the platform's, not Summit's.** Buttons, cards, muted text and
 * focus rings all come from the shared shadcn tokens the rest of IG uses — the
 * same set `ChronicleChatPanel` is built on. Summit's bespoke `components/ui.tsx`
 * and its hard-coded teal are a second, parallel design system beside the
 * platform's own; growing that fork to fit the interview would have doubled the
 * surface anyone maintaining IG chat has to keep in step. Reuse, then retire.
 */
import { useEffect, useRef, useState } from "react"
import { Bot, Loader2, Send, SkipForward, Sparkles, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import AssistantMarkdown from "@/components/user/chat/AssistantMarkdown"
import {
  MAX_LADDER_RUNGS,
  useSummitInterview,
  type InterviewTurn,
} from "@/hooks/summit/useSummitInterview"
import { useGoalSession } from "@/hooks/summit/useGoalSession"
import { SUMMIT_CATEGORY_KEYS } from "@/types/summit"

/** What the header says we are doing right now. */
function progressLabel(
  phase: string,
  label: string | undefined,
  questionNumber: number,
  questionCount: number,
  ladderRung: number
): string {
  if (phase === "opening") return "Getting the next questions…"
  if (phase === "question" && questionCount > 0) {
    return `${label ?? "Discovery"} · question ${Math.min(questionNumber, questionCount)} of ${questionCount}`
  }
  if (phase === "stating-goal") return "In your own words"
  if (phase === "ladder") {
    return `Why · ${Math.min(ladderRung + 1, MAX_LADDER_RUNGS)} of up to ${MAX_LADDER_RUNGS}`
  }
  if (phase === "synthesizing") return "Drafting your goals…"
  if (phase === "complete") return "Goals drafted"
  return "Goal-setting interview"
}

function Turn({ turn }: { turn: InterviewTurn }) {
  const isUser = turn.role === "user"
  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-muted" : "bg-primary/10"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        ) : (
          <Bot className="h-3.5 w-3.5 text-primary" aria-hidden />
        )}
      </span>
      <div
        className={cn(
          "max-w-[85%] rounded-lg p-2 text-xs",
          isUser
            ? "whitespace-pre-wrap bg-muted"
            : turn.kind === "root"
              ? // The root is the point of the whole ladder. It gets to look
                // like it, rather than scrolling past as one more grey bubble.
                "border border-primary/30 bg-primary/5 font-medium text-foreground"
              : turn.kind === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted/50"
        )}
      >
        {isUser ? (
          turn.text
        ) : (
          <AssistantMarkdown text={turn.text} className="text-left" />
        )}
      </div>
    </div>
  )
}

export default function SummitInterviewPanel({
  className,
}: {
  className?: string
}) {
  const { data: session } = useGoalSession()
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const interview = useSummitInterview({ session })
  const {
    turns,
    phase,
    busy,
    categoryKey,
    questionNumber,
    questionCount,
    ladderRung,
    start,
    answer,
    skipCategory,
    synthesise,
  } = interview

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [turns, busy])

  const categoryLabel = categoryKey
    ? session?.categories?.[categoryKey]?.label
    : undefined

  const exploredCount = SUMMIT_CATEGORY_KEYS.filter(
    (k) => session?.categories?.[k]?.status === "explored"
  ).length

  // Offer synthesis whenever there is genuinely something to synthesise, rather
  // than only at the end of a full run. Someone who explores two categories and
  // stops should be able to see goals from those two.
  const canSynthesise =
    exploredCount > 0 && !busy && phase !== "synthesizing" && phase !== "complete"

  const acceptsAnswer =
    phase === "question" || phase === "stating-goal" || phase === "ladder"

  // Something was said, and there is no open question — i.e. a step failed.
  const stalled = phase === "idle" && turns.length > 0 && !busy

  return (
    <aside
      className={cn(
        "flex h-full min-h-[28rem] w-full flex-col overflow-hidden border-l bg-card",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Summit</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {progressLabel(
              phase,
              categoryLabel,
              questionNumber,
              questionCount,
              ladderRung
            )}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-3"
        data-testid="summit-interview-thread"
      >
        {turns.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Summit works through five areas of your working life, a few
              questions at a time, then asks <em>why</em> until it reaches what
              actually sits underneath. What comes out are goals with a reason
              attached — not a list you typed.
            </p>
            {exploredCount > 0 && (
              <p className="text-xs text-muted-foreground">
                You&apos;ve explored {exploredCount} of{" "}
                {SUMMIT_CATEGORY_KEYS.length} areas. We&apos;ll pick up where you
                left off.
              </p>
            )}
            <Button type="button" size="sm" onClick={start} disabled={busy}>
              {exploredCount > 0 ? "Continue the conversation" : "Start the conversation"}
            </Button>
          </div>
        ) : (
          turns.map((turn) => <Turn key={turn.id} turn={turn} />)
        )}

        {busy && (
          <div className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-3.5 w-3.5 text-primary" aria-hidden />
            </span>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Live region — announces where the interview is to assistive tech. */}
      <div className="sr-only" role="status" aria-live="polite">
        {progressLabel(
          phase,
          categoryLabel,
          questionNumber,
          questionCount,
          ladderRung
        )}
      </div>

      {(phase === "question" || canSynthesise || stalled) && (
        <div className="flex flex-wrap gap-2 border-t px-3 pt-2">
          {/* A failure pushes an error turn, which retires the empty state and
              the Start button with it. Without this the person is left looking
              at an apology and a disabled input — stranded by the very message
              telling them nothing was lost. */}
          {stalled && (
            <Button type="button" size="sm" className="h-7 px-2 text-[11px]" onClick={start}>
              Try again
            </Button>
          )}
          {phase === "question" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px] text-muted-foreground"
              onClick={() => void skipCategory()}
              disabled={busy}
            >
              <SkipForward className="h-3 w-3" aria-hidden />
              Skip this area
            </Button>
          )}
          {canSynthesise && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => void synthesise()}
            >
              Draft my goals now
            </Button>
          )}
        </div>
      )}

      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void answer(input)
          setInput("")
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!acceptsAnswer || busy}
          placeholder={
            acceptsAnswer ? "Your answer…" : "Start the conversation to answer"
          }
          aria-label="Your answer"
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!acceptsAnswer || busy || !input.trim()}
        >
          <Send className="h-4 w-4" aria-hidden />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </aside>
  )
}
