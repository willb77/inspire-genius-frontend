import { useCallback, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Bot, Loader2, Send, User, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import AssistantMarkdown from "@/components/user/chat/AssistantMarkdown"
import { useAuth } from "@/context/useAuth"
import { useMeridianChat } from "@/hooks/agents/useMeridianChat"
import type { ChatJob } from "@/hooks/agents/useMeridianJob"
import { chatMessageSchema, type ChatMessageForm } from "./chatMessage.schema"
import { EXERCISE_SURFACE, turnSendsToCounselor } from "./exerciseTurn"

/**
 * CX-5 — the exercise's chat, beside the worksheet.
 *
 * Transport: `useMeridianChat` ONLY — `POST /v1/agents/chat/async`, polled; the
 * socket is a push accelerator and nothing is ever sent over it
 * (`.claude/rules/agents.md` §6). Its `error` is rendered (role="alert"),
 * never swallowed.
 *
 * Context is exactly `{ surface: "career_exercise" }`: the server loads the
 * caller's own ACTIVE session from the token, so nothing about the person or
 * the session is sent from here (a `member_id` would make the server treat the
 * turn as about someone else and not enter the exercise at all).
 *
 * A turn the exercise's guardrails blocked or held (CX-3) comes back with
 * `metadata.career_exercise.next === "counselor"`. That reply is shown as what
 * it is — a pointer to the student's counselor — and stays on screen; it is
 * never a blank or a spinner.
 */

type Turn = { id: string; role: "user" | "assistant"; content: string; counselor?: boolean }

let seq = 0
const nextId = (p: string) => `${p}-${Date.now()}-${++seq}`

export type ExerciseChatProps = {
  sessionId: string
  /** False while the session is paused or finished: the exercise only runs on an active session. */
  canSend: boolean
  /** Why sending is off, said beside the box. */
  disabledReason?: string
  /** Called after every settled turn, so the worksheet re-reads the session. */
  onTurnSettled: () => void
}

export function ExerciseChat({ sessionId, canSend, disabledReason, onTurnSettled }: ExerciseChatProps) {
  const { user } = useAuth()
  const [turns, setTurns] = useState<Turn[]>([])
  const [counselor, setCounselor] = useState<string | null>(null)

  const onAssistant = useCallback(
    (content: string, job: ChatJob) => {
      const toCounselor = turnSendsToCounselor(job)
      setTurns((prev) => [...prev, { id: nextId("a"), role: "assistant", content, counselor: toCounselor }])
      setCounselor(toCounselor ? content : null)
      onTurnSettled()
    },
    [onTurnSettled],
  )

  const { send, isProcessing, partial, error, clearError } = useMeridianChat({
    sessionKey: `career-exercise:${sessionId}`,
    accessToken: user?.token ?? "",
    context: { surface: EXERCISE_SURFACE },
    onAssistant,
    onError: () => onTurnSettled(),
  })

  const form = useForm<ChatMessageForm>({
    resolver: zodResolver(chatMessageSchema),
    defaultValues: { message: "" },
  })

  const onSubmit = form.handleSubmit(async ({ message }) => {
    setTurns((prev) => [...prev, { id: nextId("u"), role: "user", content: message }])
    form.reset({ message: "" })
    await send(message)
  })

  const disabled = !canSend || isProcessing

  return (
    <section aria-label="Talk it through" className="flex min-h-[28rem] flex-col rounded-xl border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="text-base font-semibold">Talk it through</h2>
        <p className="text-xs text-muted-foreground">
          Your worksheet fills in as you go. You can stop at any time and pick up where you left off.
        </p>
      </header>

      {counselor !== null && (
        <div role="alert" className="m-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <UserRound className="h-4 w-4" aria-hidden />
            Talk to your counselor
          </p>
          <p className="mt-1">
            The exercise has stopped here for now and your counselor is the next step. The message below says why.
          </p>
        </div>
      )}

      <ol className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {turns.length === 0 && !isProcessing && (
          <li className="text-sm text-muted-foreground">
            {canSend ? "Say hello to start, or pick up where you left off." : disabledReason}
          </li>
        )}
        {turns.map((t) => (
          <li key={t.id} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                t.role === "user"
                  ? "max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : t.counselor
                    ? "max-w-[85%] rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                    : "max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm"
              }
            >
              <span className="sr-only">{t.role === "user" ? "You said:" : "Meridian said:"}</span>
              {t.role === "user" ? (
                <span className="inline-flex items-start gap-2">
                  <User className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="whitespace-pre-wrap">{t.content}</span>
                </span>
              ) : (
                <span className="inline-flex items-start gap-2">
                  <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <AssistantMarkdown text={t.content} />
                </span>
              )}
            </div>
          </li>
        ))}
        {isProcessing && (
          <li className="flex justify-start">
            <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              {partial ? (
                <AssistantMarkdown text={partial} />
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Thinking…
                </span>
              )}
            </div>
          </li>
        )}
      </ol>

      {error && (
        <div role="alert" className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-destructive/40 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <div className="flex-1">
            <p>{error}</p>
            <p className="text-xs text-muted-foreground">Your worksheet is saved; nothing was lost.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={clearError}>
            Dismiss
          </Button>
        </div>
      )}

      <form onSubmit={onSubmit} className="border-t p-3">
        <Label htmlFor="career-exercise-message" className="sr-only">
          Your message
        </Label>
        <div className="flex items-end gap-2">
          <Textarea
            id="career-exercise-message"
            rows={2}
            placeholder={canSend ? "Type your answer…" : disabledReason}
            disabled={!canSend}
            {...form.register("message")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void onSubmit()
              }
            }}
          />
          <Button type="submit" disabled={disabled} aria-label="Send">
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          </Button>
        </div>
        {form.formState.errors.message && (
          <p className="mt-1 text-xs text-destructive">{form.formState.errors.message.message}</p>
        )}
        {!canSend && disabledReason && <p className="mt-1 text-xs text-muted-foreground">{disabledReason}</p>}
      </form>
    </section>
  )
}
