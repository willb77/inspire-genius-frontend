/**
 * The goal interview, run in Direction Setting as a spoken conversation.
 *
 * Stage 5 used to be a door: it explained the step and sent people to
 * `/summit/*`. Its own header argued that was right because Summit's surface —
 * a three-column shell with its own sub-nav and chat panel — could not be
 * embedded without forking or gutting it, and a second goal system would drift
 * from the first within a release.
 *
 * That argument was sound and is now obsolete. The interview is no longer a
 * *surface*: `useSummitInterview` is a headless state machine over `/ask`,
 * `/why-ladder` and `/synthesize`. Two surfaces can drive it without forking
 * anything — same routes, same store, same goals. Nobody ends up with two lists
 * and no idea which one counts, because there is still exactly one list.
 *
 * **Voice is the default here, unlike the Summit panel.** A goal interview is a
 * conversation, and typing paragraphs about why your job is going nowhere is a
 * different, worse activity than saying it. So Summit speaks its questions and
 * listens for the answer, and text is one toggle away for anyone who wants it —
 * open-plan office, no microphone, or simply preferring to type.
 *
 * How the spoken turn works, and why it is not fully hands-free:
 *
 *   Summit speaks → the mic opens on its own → you answer → the transcript
 *   lands in the box and sends itself after a beat, with a visible cancel.
 *
 * The beat is deliberate. Fully automatic sending means one mis-transcribed
 * sentence is committed to your goal record with no way to catch it; requiring
 * a button press after every spoken answer is not a conversation. A short,
 * cancellable pause is the only version of this that is both hands-free and
 * recoverable.
 *
 * Everything degrades. No speech recognition (Firefox, most of Safari) disables
 * the mic with an explanation and leaves typing working. No TTS degrades to
 * silence, not to a broken page. Voice off is a complete, first-class way to do
 * the whole interview.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Bot,
  Loader2,
  Mic,
  MicOff,
  Send,
  SkipForward,
  User,
  Volume2,
  VolumeX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useTTS } from "@/hooks/useTTS"
import { useSpeechDictation } from "@/hooks/interview/useSpeechDictation"
import { useGoalSession } from "@/hooks/summit/useGoalSession"
import {
  useSummitInterview,
  type InterviewTurn,
} from "@/hooks/summit/useSummitInterview"
import { SUMMIT_CATEGORY_KEYS } from "@/types/summit"

/**
 * How long a spoken answer sits in the box before it sends itself.
 *
 * Long enough to read it and hit cancel; short enough that the conversation
 * does not stall after every sentence.
 */
export const AUTO_SEND_DELAY_MS = 2500

export interface GoalInterviewPanelProps {
  /** Called when goals have been synthesised, with how many. */
  onGoalsSynthesised?: (count: number) => void
  className?: string
}

function Turn({ turn }: { turn: InterviewTurn }) {
  const isUser = turn.role === "user"
  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-muted" : "bg-primary/10"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-muted-foreground" aria-hidden />
        ) : (
          <Bot className="h-4 w-4 text-primary" aria-hidden />
        )}
      </span>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          isUser
            ? "whitespace-pre-wrap bg-muted"
            : turn.kind === "root"
              ? // The root is what the whole ladder is for. It should not scroll
                // past looking like one more grey bubble.
                "border border-amber-300/60 bg-amber-50 font-medium text-foreground"
              : turn.kind === "error"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted/50"
        )}
      >
        {turn.text}
      </div>
    </div>
  )
}

export default function GoalInterviewPanel({
  onGoalsSynthesised,
  className,
}: GoalInterviewPanelProps) {
  const { data: session } = useGoalSession()
  const [input, setInput] = useState("")
  const [voiceMode, setVoiceMode] = useState(true)
  const [pendingSend, setPendingSend] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const autoSendRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const interview = useSummitInterview({ session, onGoalsSynthesised })
  const {
    turns,
    phase,
    busy,
    categoryKey,
    questionNumber,
    questionCount,
    start,
    answer,
    skipCategory,
    synthesise,
  } = interview

  const { speak, stop: stopSpeaking, speaking } = useTTS({ voice: "coral" })

  const cancelAutoSend = useCallback(() => {
    if (autoSendRef.current) {
      clearTimeout(autoSendRef.current)
      autoSendRef.current = null
    }
    setPendingSend(false)
  }, [])

  const dictation = useSpeechDictation({
    onFinal: (chunk) => {
      // Append rather than replace: recognition emits in phrases, and a long
      // answer arrives as several finals.
      setInput((prev) => (prev ? `${prev} ${chunk}` : chunk))
      if (!voiceMode) return
      // Restart the countdown on every phrase, so a pause mid-sentence does not
      // send half an answer.
      if (autoSendRef.current) clearTimeout(autoSendRef.current)
      setPendingSend(true)
      autoSendRef.current = setTimeout(() => {
        autoSendRef.current = null
        setPendingSend(false)
        setInput((current) => {
          const text = current.trim()
          if (text) void answer(text)
          return ""
        })
      }, AUTO_SEND_DELAY_MS)
    },
  })

  const acceptsAnswer =
    phase === "question" || phase === "stating-goal" || phase === "ladder"

  /**
   * Speak every unspoken Summit turn, in order, then open the mic.
   *
   * Deliberately a queue and not "speak the latest turn". A category opens by
   * pushing its intro *and* its first question in the same tick, so reading only
   * the last one silently drops the intro — the person hears a bare question
   * with none of the framing that makes it answerable. A test caught that.
   *
   * `spokenRef` is a set, not a single id: it keeps a re-render from re-reading
   * anything already read. This platform has shipped a double-read before.
   */
  const spokenRef = useRef<Set<string>>(new Set())
  const speakingQueueRef = useRef(false)
  useEffect(() => {
    if (!voiceMode) return
    if (speakingQueueRef.current) return

    const pending = turns.filter(
      (t) => t.role === "summit" && !spokenRef.current.has(t.id)
    )
    if (pending.length === 0) return
    pending.forEach((t) => spokenRef.current.add(t.id))

    let cancelled = false
    speakingQueueRef.current = true
    void (async () => {
      for (const turn of pending) {
        if (cancelled || !voiceMode) break
        await speak(turn.text)
      }
      speakingQueueRef.current = false
      if (cancelled || !voiceMode || !dictation.supported) return
      // Only listen when a question is actually open — opening the mic after a
      // closing remark would just record the room.
      const last = pending[pending.length - 1]
      if (last.kind === "question" || last.kind === "why") {
        dictation.start()
      }
    })()
    return () => {
      cancelled = true
      speakingQueueRef.current = false
    }
    // `dictation` is intentionally excluded — it is recreated each render and
    // would re-run this effect (and re-speak) on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, voiceMode, speak])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [turns, busy])

  // Leaving the page mid-sentence should not leave audio playing or a pending
  // send armed against a component that no longer exists.
  useEffect(
    () => () => {
      if (autoSendRef.current) clearTimeout(autoSendRef.current)
    },
    []
  )

  const toggleVoice = useCallback(
    (on: boolean) => {
      setVoiceMode(on)
      if (!on) {
        stopSpeaking()
        dictation.stop()
        cancelAutoSend()
      }
    },
    [stopSpeaking, dictation, cancelAutoSend]
  )

  const submit = useCallback(
    (text: string) => {
      cancelAutoSend()
      dictation.stop()
      stopSpeaking()
      const trimmed = text.trim()
      if (!trimmed) return
      setInput("")
      void answer(trimmed)
    },
    [answer, cancelAutoSend, dictation, stopSpeaking]
  )

  const exploredCount = SUMMIT_CATEGORY_KEYS.filter(
    (k) => session?.categories?.[k]?.status === "explored"
  ).length
  const canSynthesise =
    exploredCount > 0 && !busy && phase !== "synthesizing" && phase !== "complete"
  const stalled = phase === "idle" && turns.length > 0 && !busy

  const categoryLabel = categoryKey
    ? session?.categories?.[categoryKey]?.label
    : undefined

  return (
    <div
      className={cn(
        "flex min-h-[30rem] flex-col overflow-hidden rounded-lg border bg-card",
        className
      )}
      data-testid="goal-interview"
    >
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Summit</div>
          <div className="truncate text-[11px] text-muted-foreground">
            {phase === "opening"
              ? "Getting the next questions…"
              : phase === "question" && questionCount > 0
                ? `${categoryLabel ?? "Discovery"} · question ${Math.min(questionNumber, questionCount)} of ${questionCount}`
                : phase === "stating-goal"
                  ? "In your own words"
                  : phase === "ladder"
                    ? "Asking why"
                    : phase === "synthesizing"
                      ? "Drafting your goals…"
                      : phase === "complete"
                        ? "Goals drafted"
                        : "A conversation, not a form"}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {voiceMode ? (
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          )}
          <Label
            htmlFor="goal-interview-voice"
            className="text-[11px] text-muted-foreground"
          >
            Voice
          </Label>
          <Switch
            id="goal-interview-voice"
            checked={voiceMode}
            onCheckedChange={toggleVoice}
            aria-label="Voice mode: Summit reads its questions aloud and listens for your answer"
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {turns.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Summit works through five areas of your working life a few
              questions at a time, then asks <em>why</em> until it reaches what
              actually sits underneath. What comes out are goals with a reason
              attached — not a list you typed.
            </p>
            <p className="text-xs text-muted-foreground">
              {voiceMode
                ? "It will read its questions aloud and listen for your answer. Turn Voice off to type instead."
                : "Text mode — read and type. Turn Voice on to have the conversation out loud."}
            </p>
            {exploredCount > 0 && (
              <p className="text-xs text-muted-foreground">
                You&apos;ve explored {exploredCount} of{" "}
                {SUMMIT_CATEGORY_KEYS.length} areas. We&apos;ll pick up where you
                left off.
              </p>
            )}
            <Button type="button" onClick={start} disabled={busy}>
              {exploredCount > 0 ? "Continue the conversation" : "Start the conversation"}
            </Button>
          </div>
        ) : (
          turns.map((turn) => <Turn key={turn.id} turn={turn} />)
        )}

        {busy && (
          <div className="flex gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" aria-hidden />
            </span>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Announces state changes to assistive tech — and to anyone who has the
          screen turned away because they are having a conversation. */}
      <div className="sr-only" role="status" aria-live="polite">
        {speaking
          ? "Summit is speaking."
          : dictation.listening
            ? "Listening. Speak your answer."
            : pendingSend
              ? "Sending your answer."
              : ""}
      </div>

      {(phase === "question" || canSynthesise || stalled) && (
        <div className="flex flex-wrap gap-2 border-t px-3 pt-2">
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

      {/* The cancellable beat before a spoken answer commits itself. */}
      {pendingSend && (
        <div className="flex items-center gap-2 border-t bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          <span className="min-w-0 flex-1">Sending your answer…</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-6 px-2 text-[11px]"
            onClick={cancelAutoSend}
          >
            Hold on — let me edit
          </Button>
        </div>
      )}

      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
      >
        {voiceMode &&
          (dictation.supported ? (
            <Button
              type="button"
              size="icon"
              variant={dictation.listening ? "default" : "outline"}
              onClick={() => {
                cancelAutoSend()
                dictation.toggle()
              }}
              disabled={!acceptsAnswer}
              aria-pressed={dictation.listening}
              aria-label={
                dictation.listening ? "Stop recording your answer" : "Answer by voice"
              }
              title={dictation.listening ? "Stop recording" : "Answer by voice"}
            >
              {dictation.listening ? (
                <MicOff className="h-4 w-4" aria-hidden />
              ) : (
                <Mic className="h-4 w-4" aria-hidden />
              )}
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    disabled
                    aria-label="Voice input isn't supported in this browser"
                  >
                    <MicOff className="h-4 w-4" aria-hidden />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Voice input isn&apos;t supported in this browser — turn Voice off
                and type your answers instead.
              </TooltipContent>
            </Tooltip>
          ))}

        <input
          value={input}
          onChange={(e) => {
            // Typing is an override: it means the person is correcting what was
            // heard, so the automatic send must not fire underneath them.
            cancelAutoSend()
            setInput(e.target.value)
          }}
          disabled={!acceptsAnswer || busy}
          placeholder={
            dictation.listening
              ? "Listening…"
              : acceptsAnswer
                ? "Your answer…"
                : "Start the conversation to answer"
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
    </div>
  )
}
