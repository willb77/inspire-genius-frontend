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
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Bot,
  Loader2,
  Sparkles,
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
import { MERIDIAN_VOICE, useTTS } from "@/hooks/useTTS"
import { useSpeechDictation } from "@/hooks/interview/useSpeechDictation"
import { useGoalSession } from "@/hooks/summit/useGoalSession"
import {
  useSummitInterview,
  type InterviewTurn,
} from "@/hooks/summit/useSummitInterview"
import { SUMMIT_CATEGORY_KEYS } from "@/types/summit"

/**
 * How long the mic must go quiet before a spoken answer sends itself.
 *
 * This was 2500ms and measured from the last *finalised phrase*, which is not
 * the same thing as the person having finished. Someone asked why their job
 * matters pauses to think mid-answer — and the timer fired on whatever had been
 * captured so far. Combined with recognition that was not restarting after its
 * own timeout, that is the "captures maybe a few words" report.
 *
 * Now it is measured from the last sign of speech of ANY kind, interim included,
 * so thinking mid-sentence does not end the answer. Six seconds is long enough
 * to gather a thought and short enough that the conversation does not stall;
 * the countdown is visible and cancellable throughout, and typing overrides it.
 */
export const AUTO_SEND_DELAY_MS = 6000

export interface GoalInterviewPanelProps {
  /** Called when goals have been synthesised, with how many. */
  onGoalsSynthesised?: (count: number) => void
  className?: string
}

function Turn({
  turn,
  questionNumber,
}: {
  turn: InterviewTurn
  /** 1-based running number for this turn when it is an actual question. */
  questionNumber?: number
}) {
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
      <div className={cn("max-w-[80%]", isUser && "flex flex-col items-end")}>
        {/* Item 8: a running number on each question so the person can feel
            progress and roughly how much is left. Only real questions are
            numbered — intros, why-ladder follow-ups and the root are not. */}
        {questionNumber != null && (
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary/70">
            Question {questionNumber}
          </div>
        )}
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
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
    categoryNumber,
    categoryTotal,
    questionsRemaining,
    start,
    answer,
    skipCategory,
    synthesise,
  } = interview

  // Meridian's voice — the only voice the platform speaks in. `useTTS` now
  // defaults to it, but state it here so the intent is on the page.
  const { speak, stop: stopSpeaking, speaking } = useTTS({ voice: MERIDIAN_VOICE })

  // `speak`'s identity is NOT stable: calling it flips `useTTS` internal state
  // (speaking/activeProvider), which re-renders and hands back a new `speak`.
  // The speaking-queue effect below must NOT list `speak` in its deps, or that
  // churn re-runs the effect mid-queue, its cleanup sets `cancelled = true`, and
  // the `for` loop breaks after the FIRST turn — the classic "only the first
  // question is spoken, the rest are silent" bug. Read `speak` through a ref so
  // the queue always calls the latest one without depending on its identity.
  const speakRef = useRef(speak)
  speakRef.current = speak

  // The dictation callbacks are registered once and would otherwise close over
  // the first render's values — reading `voiceMode` there would keep reporting
  // whatever it was when the mic first opened.
  const voiceModeRef = useRef(voiceMode)
  voiceModeRef.current = voiceMode
  const answerRef = useRef(answer)
  answerRef.current = answer

  const cancelAutoSend = useCallback(() => {
    if (autoSendRef.current) {
      clearTimeout(autoSendRef.current)
      autoSendRef.current = null
    }
    setPendingSend(false)
  }, [])

  /** Arm (or re-arm) the send countdown. Any speech at all defers it. */
  const armAutoSend = useCallback(() => {
    if (autoSendRef.current) clearTimeout(autoSendRef.current)
    setPendingSend(true)
    autoSendRef.current = setTimeout(() => {
      autoSendRef.current = null
      setPendingSend(false)
      setInput((current) => {
        const text = current.trim()
        if (text) void answerRef.current(text)
        return ""
      })
    }, AUTO_SEND_DELAY_MS)
  }, [])

  const dictation = useSpeechDictation({
    // Still speaking — push the send back. Without this, a pause to think is
    // indistinguishable from the end of an answer.
    onInterim: () => {
      if (!voiceModeRef.current) return
      if (autoSendRef.current) {
        clearTimeout(autoSendRef.current)
        autoSendRef.current = null
      }
      setPendingSend(false)
    },
    onFinal: (chunk) => {
      // Append rather than replace: recognition emits in phrases, and a long
      // answer arrives as several finals.
      setInput((prev) => (prev ? `${prev} ${chunk}` : chunk))
      if (!voiceModeRef.current) return
      armAutoSend()
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
        await speakRef.current(turn.text)
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
    // `speak` is read through `speakRef` (its identity is unstable — see above),
    // and `dictation` is recreated each render; listing either would re-run this
    // effect mid-queue and drop every turn after the first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, voiceMode])

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

  // A running 1-based number for every actual question turn (not intros, why-
  // ladder follow-ups or the root), so each question can show "Question N" and
  // the header can show how many have been asked so far. Cheap to recompute:
  // the transcript is small and this only runs when `turns` changes.
  const questionOrdinals = useMemo(() => {
    const map = new Map<string, number>()
    let n = 0
    for (const t of turns) {
      if (t.role === "summit" && t.kind === "question") {
        n += 1
        map.set(t.id, n)
      }
    }
    return map
  }, [turns])
  const askedCount = questionOrdinals.size

  return (
    <div
      className={cn(
        // Bounded height so the progress strip + header stay put while ONLY the
        // conversation scrolls inside the tile (item 7). Without a ceiling the
        // panel grows with the transcript and the whole page scrolls, taking the
        // "fixed" header with it.
        "flex h-[calc(100vh-15rem)] max-h-[46rem] min-h-[28rem] flex-col overflow-hidden rounded-lg border bg-card",
        className
      )}
      data-testid="goal-interview"
    >
      {/* Item 3: a person answering questions out loud cannot see how long
          this goes on for. The five areas are fixed and knowable; the questions
          inside one are only known once Summit has asked for them, so the
          within-area count appears when it is real rather than being guessed
          up front. Promising "12 questions" and then asking 17 would be worse
          than saying nothing. */}
      {phase !== "idle" && categoryNumber > 0 && (
        <div className="border-b bg-muted/30 px-3 py-2" data-testid="interview-progress">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
            <span>
              Area {categoryNumber} of {categoryTotal}
              {categoryLabel ? ` · ${categoryLabel}` : ""}
            </span>
            {questionCount > 0 && phase === "question" && (
              <span>
                Question {Math.min(questionNumber, questionCount)} of {questionCount}
                {questionsRemaining > 1 ? ` · ${questionsRemaining - 1} more here` : ""}
              </span>
            )}
          </div>
          <div
            className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={categoryTotal}
            aria-valuenow={categoryNumber}
            aria-label={`Area ${categoryNumber} of ${categoryTotal}`}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${(categoryNumber / categoryTotal) * 100}%` }}
            />
          </div>
        </div>
      )}

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

        <div className="ml-auto flex items-center gap-2">
          {/* Item 7: a persistent question count pinned in the fixed header
              border, so how far along you are stays visible no matter how far
              the conversation below has scrolled. */}
          {askedCount > 0 && (
            <span
              className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
              data-testid="question-count"
            >
              Question {askedCount}
            </span>
          )}
          <div className="flex items-center gap-1.5">
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
          turns.map((turn) => (
            <Turn
              key={turn.id}
              turn={turn}
              questionNumber={questionOrdinals.get(turn.id)}
            />
          ))
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
        <div className="flex flex-col gap-2 border-t px-3 pt-2">
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
          {/* Item 4: this is the action the whole interview exists to reach, and
              it was a 7px-tall ghost pill sitting beside "Skip this area" —
              indistinguishable from the secondary controls. It now reads as the
              primary action it is. Full width on its own row so it is not
              competing with the skip control for the eye. */}
          {canSynthesise && (
            <Button
              type="button"
              size="default"
              onClick={() => void synthesise()}
              data-testid="draft-goals"
              className="w-full gap-2 bg-primary font-semibold shadow-sm hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Draft my goals
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
