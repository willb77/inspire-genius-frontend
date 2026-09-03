/**
 * Chronicle interview tile for the Bio Capture surface.
 *
 * This is the full-width interview panel that sits below the chapters strip. It
 * is an interactive, optionally-spoken interview: Chronicle asks, the member
 * answers (by voice or text), and every turn is distilled into their profile.
 * The tile scrolls both ways — vertically through the conversation and the
 * insight rail, horizontally on narrow viewports where the two panes exceed the
 * width — and the results, insights and end-of-session recap all render inside
 * it rather than in a separate column.
 *
 * Transport: `useMeridianChat` — `POST /v1/agents/chat/async`, polled, with the
 * socket as a push accelerator only. It used to SEND over the WebSocket, which
 * meant that on the tier whose ws-proxy invoked a forwarder named for a
 * different environment, absent from that account the interview accepted an answer and then
 * went silent forever, error frame discarded. Chronicle is the coaching
 * specialist Meridian routes to on bio/life-story keywords, so the panel seeds
 * a bio-oriented context (`surface: "bio_capture"`, `agent_hint: "chronicle"`)
 * and every reply comes back in Meridian's unified voice — the platform
 * contract. See `.claude/rules/agents.md` §6.
 *
 * Audio (one switch, on/off): when on, `useTTS` reads Chronicle's newest reply
 * aloud so the interview guides the member spoken-word, and `useSpeechDictation`
 * transcribes a spoken answer into the input for review before sending. Both
 * degrade gracefully — no speech recognition ⇒ the mic is disabled with an
 * explanation and typing still works; no TTS ⇒ it silently stays text.
 *
 * Capture: alongside each send (never blocking the reply) the panel calls
 * `POST /v1/agents/bio/{id}/capture`, which extracts + persists what the member
 * said and returns it structured. That renders inline as a "Captured to your
 * profile" card and drives the content-specific "Go deeper" chips and the live
 * insight rail. On **End & recap** the whole session is summarised in place.
 *
 * Sessions: **Save** upserts the transcript to `/v1/agents/bio/{id}/sessions`
 * and the **Sessions** dropdown reloads a past one to continue it. A missing
 * session backend degrades to an unsaved-but-working interview.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Bot,
  FilePlus2,
  History,
  Mic,
  MicOff,
  Save,
  Send,
  Square,
  User,
  Volume2,
  VolumeX,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/useAuth"
import AssistantMarkdown from "@/components/user/chat/AssistantMarkdown"
import { moduleLabel } from "@/lib/bio/clientMemoir"
import { useSpeechDictation } from "@/hooks/interview/useSpeechDictation"
import { useTTS } from "@/hooks/useTTS"
import { useMeridianChat } from "@/hooks/agents/useMeridianChat"
import { useCaptureBioTurn } from "@/hooks/useCaptureBioTurn"
import {
  useBioSessions,
  useLoadBioSession,
  useSaveBioSession,
} from "@/hooks/useBioSessions"
import CapturedTurnCard from "@/components/user/bio/CapturedTurnCard"
import SessionRecapCard, {
  type SessionRecap,
} from "@/components/user/bio/SessionRecapCard"
import type { CaptureResponse } from "@/types/bio"

type ChatTurn = { role: "user" | "assistant"; content: string; id: string }

const SUGGESTED_PROMPTS = [
  "I'd like to start telling my life story.",
  "Help me capture a major event that shaped me.",
  "Ask me about my background and where I grew up.",
  "What haven't we talked about yet?",
]

/**
 * Minimal starter probes shown only before the first turn returns real,
 * content-derived followups. After that, the "Go deeper" chips come entirely
 * from the capture endpoint's `suggestedFollowups` for the last thing said.
 */
const STARTER_FOLLOWUPS = [
  "Tell me about where I grew up.",
  "Ask me about the people who shaped me.",
  "Help me capture a turning point in my life.",
] as const

let _idSeq = 0
function nextId(prefix: string): string {
  _idSeq += 1
  return `${prefix}-${Date.now()}-${_idSeq}`
}

export type ChronicleChatPanelProps = {
  memberId: string
  /** Called when an assistant turn settles, so the parent can refetch the narrative. */
  onTurnSettled?: () => void
  /** Which module the viewer is nudging the member toward, forwarded as context. */
  suggestedModule?: string | null
  /**
   * Lets the parent drive the chat: the panel registers a `seed(moduleType)`
   * function here so the chapters strip's tiles can open that chapter as a sent
   * message. Registered on mount, cleared on unmount.
   */
  registerSeed?: (seed: ((moduleType: string) => void) | null) => void
  className?: string
}

export function ChronicleChatPanel({
  memberId,
  onTurnSettled,
  suggestedModule,
  registerSeed,
  className,
}: ChronicleChatPanelProps) {
  const { user } = useAuth()
  const accessToken = user?.token ?? ""

  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState("")
  const [voiceMode, setVoiceMode] = useState(false)
  // Structured reflections keyed by the user turn they belong to, so each
  // "Captured to your profile" card renders directly under its own message.
  const [captures, setCaptures] = useState<Record<string, CaptureResponse>>({})
  // Content-specific "Go deeper" chips from the latest capture. Empty until the
  // first turn returns real followups; a starter set stands in until then.
  const [followups, setFollowups] = useState<string[]>([])
  // The saved session this interview belongs to (null = unsaved / new session).
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  // Set when the member ends the interview — drives the in-tile recap.
  const [recap, setRecap] = useState<SessionRecap | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const onTurnSettledRef = useRef(onTurnSettled)
  onTurnSettledRef.current = onTurnSettled

  const { mutate: captureTurn } = useCaptureBioTurn()
  const { data: savedSessions = [] } = useBioSessions(memberId || null)
  const { mutateAsync: saveSession, isPending: saving } = useSaveBioSession()
  const { mutateAsync: loadSession } = useLoadBioSession()

  const onAssistant = useCallback((content: string) => {
    setTurns((prev) => [...prev, { role: "assistant", content, id: nextId("a") }])
    onTurnSettledRef.current?.()
  }, [])

  const {
    send: sendToMeridian,
    isProcessing,
    partial,
    error,
    clearError,
  } = useMeridianChat({
    sessionKey: memberId || "bio",
    accessToken,
    context: { surface: "bio_capture", agent_hint: "chronicle", member_id: memberId },
    onAssistant,
  })

  // ── Audio: read Chronicle's reply aloud + capture the spoken answer ──────────
  const { speak, stop: stopSpeaking, speaking } = useTTS({ voice: "coral" })
  const dictation = useSpeechDictation({
    onFinal: (chunk) =>
      // Review-then-send (matches Interview Practice): the transcript lands in
      // the input so the member can tidy it before sending.
      setInput((prev) => (prev ? `${prev} ${chunk}` : chunk)),
  })

  // Speak each newly-settled assistant turn once, only while audio is on.
  const spokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (!voiceMode) return
    const last = turns[turns.length - 1]
    if (last && last.role === "assistant" && spokenRef.current !== last.id) {
      spokenRef.current = last.id
      void speak(last.content)
    }
  }, [voiceMode, turns, speak])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [turns, partial, error, recap])

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      // A new steer ends any in-flight listening/speaking so the turns don't
      // talk over each other, and clears a stale recap — the interview resumed.
      dictation.stop()
      stopSpeaking()
      setRecap(null)
      const userTurnId = nextId("u")
      setTurns((prev) => [
        ...prev,
        { role: "user", content: trimmed, id: userTurnId },
      ])
      void sendToMeridian(trimmed, {
        suggested_module: suggestedModule ?? undefined,
      })
      setInput("")

      // Fire the capture ALONGSIDE the chat send — the WebSocket carries the
      // conversational reply; this call returns the structured reflection and
      // the content-specific followups. It must never block or gate the reply,
      // so it runs in parallel and its failure is swallowed (best-effort).
      captureTurn(
        { memberId, message: trimmed, moduleHint: suggestedModule ?? null },
        {
          onSuccess: (res) => {
            if (res.captured && res.episodes.length > 0) {
              setCaptures((prev) => ({ ...prev, [userTurnId]: res }))
            }
            if (res.suggestedFollowups.length > 0) {
              setFollowups(res.suggestedFollowups)
            }
          },
          onError: () => {},
        },
      )
    },
    [sendToMeridian, memberId, suggestedModule, dictation, stopSpeaking, captureTurn],
  )

  // Expose a seed function so the chapters strip can open a chapter as a message.
  useEffect(() => {
    if (!registerSeed) return
    registerSeed((moduleType: string) =>
      send(`Let's talk about my ${moduleLabel(moduleType).toLowerCase()}.`),
    )
    return () => registerSeed(null)
  }, [registerSeed, send])

  // "Go deeper" chips: the content-specific followups from the last capture,
  // falling back to a minimal starter set before the first turn returns any.
  const visibleProbes = useMemo(
    () => (followups.length > 0 ? followups : [...STARTER_FOLLOWUPS]),
    [followups],
  )

  // Live session insight, derived from the captures gathered so far.
  const insight = useMemo(() => {
    const capList = Object.values(captures)
    const modulesTouched: string[] = []
    const capturedTitles: string[] = []
    const standouts: string[] = []
    for (const c of capList) {
      if (c.moduleType && !modulesTouched.includes(c.moduleType))
        modulesTouched.push(c.moduleType)
      for (const ep of c.episodes) capturedTitles.push(ep.title)
      if (c.whatStandsOut) standouts.push(c.whatStandsOut)
    }
    return { modulesTouched, capturedTitles, standouts }
  }, [captures])

  const toggleVoiceMode = useCallback(
    (on: boolean) => {
      setVoiceMode(on)
      if (!on) {
        stopSpeaking()
        dictation.stop()
      }
    },
    [stopSpeaking, dictation],
  )

  const transcriptForSave = useCallback(
    () => turns.map((t) => ({ role: t.role, content: t.content })),
    [turns],
  )

  const buildSummary = useCallback(() => {
    if (insight.standouts.length > 0) return insight.standouts[0]
    if (insight.capturedTitles.length > 0)
      return `Captured: ${insight.capturedTitles.slice(0, 3).join("; ")}.`
    return ""
  }, [insight])

  const handleSave = useCallback(async () => {
    if (turns.length === 0) {
      toast.info("Nothing to save yet — start the interview first.")
      return
    }
    try {
      const saved = await saveSession({
        memberId,
        sessionId: currentSessionId,
        transcript: transcriptForSave(),
        summary: buildSummary(),
      })
      setCurrentSessionId(saved.sessionId)
      toast.success("Interview saved — you can continue it any time.")
    } catch {
      toast.error("Couldn't save this session — it's still here in the meantime.")
    }
  }, [turns.length, saveSession, memberId, currentSessionId, transcriptForSave, buildSummary])

  const handleEndAndRecap = useCallback(() => {
    dictation.stop()
    stopSpeaking()
    const built: SessionRecap = {
      summary: buildSummary(),
      turnCount: turns.filter((t) => t.role === "user").length,
      modulesTouched: insight.modulesTouched,
      capturedTitles: insight.capturedTitles,
      standouts: insight.standouts,
    }
    setRecap(built)
    // Best-effort auto-save so ending an interview persists it too.
    if (turns.length > 0) {
      void saveSession({
        memberId,
        sessionId: currentSessionId,
        transcript: transcriptForSave(),
        summary: built.summary,
      })
        .then((saved) => setCurrentSessionId(saved.sessionId))
        .catch(() => {})
    }
  }, [
    dictation,
    stopSpeaking,
    buildSummary,
    turns,
    insight,
    saveSession,
    memberId,
    currentSessionId,
    transcriptForSave,
  ])

  const resetInterview = useCallback(() => {
    dictation.stop()
    stopSpeaking()
    setTurns([])
    setCaptures({})
    setFollowups([])
    setRecap(null)
    setCurrentSessionId(null)
    setInput("")
    spokenRef.current = null
  }, [dictation, stopSpeaking])

  const handleResumeSession = useCallback(
    async (sessionId: string) => {
      try {
        const detail = await loadSession({ memberId, sessionId })
        dictation.stop()
        stopSpeaking()
        setTurns(
          detail.transcript.map((t) => ({
            role: t.role,
            content: t.content,
            id: nextId(t.role === "user" ? "u" : "a"),
          })),
        )
        setCaptures({})
        setFollowups([])
        setRecap(null)
        setInput("")
        setCurrentSessionId(detail.sessionId)
        spokenRef.current = null
        toast.success(`Resumed "${detail.title}".`)
      } catch {
        toast.error("Couldn't open that session — please try again.")
      }
    },
    [loadSession, memberId, dictation, stopSpeaking],
  )

  return (
    <div
      className={cn(
        "flex h-[34rem] flex-col overflow-hidden rounded-lg border bg-card",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Chronicle interview</div>
          {/* Not a socket indicator: the socket no longer carries the answer,
              so reporting it as "Connected" described a transport the member
              does not depend on — and it read green throughout the outage that
              made this panel mute. Report the turn instead. */}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {isProcessing ? "Chronicle is thinking…" : "Ready when you are"}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Audio on/off (single switch) */}
          <div className="flex items-center gap-1.5">
            {voiceMode ? (
              <Volume2 className="h-3.5 w-3.5 text-primary" aria-hidden />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            )}
            <Label
              htmlFor="chronicle-voice-mode"
              className="text-[11px] text-muted-foreground"
            >
              Audio
            </Label>
            <Switch
              id="chronicle-voice-mode"
              checked={voiceMode}
              onCheckedChange={toggleVoiceMode}
              aria-label="Audio: read Chronicle's questions aloud and answer by speaking"
            />
          </div>

          {/* Sessions dropdown — resume / start new */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5">
                <History className="h-3.5 w-3.5" aria-hidden />
                Sessions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
              <DropdownMenuItem onSelect={resetInterview}>
                <FilePlus2 className="mr-2 h-4 w-4" aria-hidden />
                New session
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Continue a session</DropdownMenuLabel>
              {savedSessions.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No saved sessions yet.
                </div>
              ) : (
                savedSessions.map((s) => (
                  <DropdownMenuItem
                    key={s.sessionId}
                    onSelect={() => void handleResumeSession(s.sessionId)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="line-clamp-1 text-xs font-medium">
                      {s.title || "Untitled session"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.turnCount} {s.turnCount === 1 ? "exchange" : "exchanges"}
                      {s.sessionId === currentSessionId ? " · current" : ""}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => void handleSave()}
            disabled={saving || turns.length === 0}
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {saving ? "Saving…" : "Save"}
          </Button>

          {/* End & recap */}
          <Button
            variant="secondary"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleEndAndRecap}
            disabled={turns.length === 0}
          >
            <Square className="h-3.5 w-3.5" aria-hidden />
            End &amp; recap
          </Button>
        </div>
      </div>

      {/* Body — scrolls horizontally on narrow viewports; each pane scrolls
          vertically. Together this makes the tile scroll up-down and right-left. */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex h-full min-w-[46rem]">
          {/* Conversation column */}
          <div className="flex min-w-[26rem] flex-1 flex-col">
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
              {recap && <SessionRecapCard recap={recap} />}

              {turns.length === 0 && !recap ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Chronicle helps you tell your story, one memory at a time.
                    Turn on Audio to be guided by voice, or just start typing:
                  </p>
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => send(p)}
                      className="block w-full rounded-lg border p-2 text-left text-xs text-muted-foreground hover:text-foreground"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              ) : (
                turns.map((turn) => (
                  <div key={turn.id} className="space-y-2">
                    <div
                      className={cn(
                        "flex gap-2",
                        turn.role === "user" ? "flex-row-reverse" : "",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                          turn.role === "user" ? "bg-muted" : "bg-primary/10",
                        )}
                      >
                        {turn.role === "user" ? (
                          <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                        ) : (
                          <Bot className="h-3.5 w-3.5 text-primary" aria-hidden />
                        )}
                      </span>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg p-2 text-xs",
                          turn.role === "user"
                            ? "whitespace-pre-wrap bg-muted"
                            : "bg-muted/50",
                        )}
                      >
                        {turn.role === "user" ? (
                          turn.content
                        ) : (
                          <div className="space-y-1">
                            <AssistantMarkdown text={turn.content} className="text-left" />
                            {voiceMode && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground"
                                onClick={() =>
                                  speaking ? stopSpeaking() : void speak(turn.content)
                                }
                                aria-label={
                                  speaking ? "Stop reading aloud" : "Read this reply aloud"
                                }
                              >
                                {speaking ? (
                                  <VolumeX className="h-3 w-3" aria-hidden />
                                ) : (
                                  <Volume2 className="h-3 w-3" aria-hidden />
                                )}
                                {speaking ? "Stop" : "Listen"}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Structured reflection for this turn, if anything was captured. */}
                    {turn.role === "user" && captures[turn.id] ? (
                      <CapturedTurnCard capture={captures[turn.id]} />
                    ) : null}
                  </div>
                ))
              )}
              {isProcessing ? (
                <div className="flex gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-3.5 w-3.5 text-primary" aria-hidden />
                  </span>
                  <div className="max-w-[80%] rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
                    {partial ? (
                      <AssistantMarkdown text={partial} className="text-left" />
                    ) : (
                      "Chronicle is thinking…"
                    )}
                  </div>
                </div>
              ) : null}
              {/* A failed turn must say so. The predecessor discarded the
                  transport's error frame, so a dead send was indistinguishable
                  from an interview waiting patiently for the member. */}
              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <p>{error}</p>
                    <button
                      type="button"
                      onClick={clearError}
                      className="mt-1 underline underline-offset-2"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* "Go deeper" — content-specific probes drawn from what was just said. */}
            <div className="border-t px-3 pt-2 pb-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Go deeper
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {visibleProbes.map((probe) => (
                  <button
                    key={probe}
                    type="button"
                    onClick={() => send(probe)}
                    disabled={isProcessing}
                    className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-50"
                  >
                    {probe}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] italic text-muted-foreground">
                Add the small things — the smell of the room, what someone was
                wearing, what was playing. The detail is the story.
              </p>
            </div>

            {/* Live region: announces listening state to assistive tech. */}
            <div className="sr-only" role="status" aria-live="polite">
              {dictation.listening ? "Listening. Speak your answer." : ""}
            </div>

            <form
              className="flex items-center gap-2 border-t p-3"
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
            >
              {voiceMode &&
                (dictation.supported ? (
                  <Button
                    type="button"
                    size="icon"
                    variant={dictation.listening ? "default" : "outline"}
                    onClick={dictation.toggle}
                    aria-label={
                      dictation.listening
                        ? "Stop recording your answer"
                        : "Answer by voice"
                    }
                    aria-pressed={dictation.listening}
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
                      Voice input isn&apos;t supported in this browser — please type
                      your answer.
                    </TooltipContent>
                  </Tooltip>
                ))}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  dictation.listening ? "Listening…" : "Tell Chronicle a memory…"
                }
                aria-label="Message Chronicle"
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || isProcessing}>
                <Send className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </div>

          {/* Insight rail — the results & insight, live, inside the scroll tile. */}
          <aside className="hidden w-[16rem] shrink-0 flex-col overflow-y-auto border-l bg-muted/20 p-3 sm:flex">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Session insight
            </div>

            {insight.capturedTitles.length === 0 &&
            insight.standouts.length === 0 ? (
              <p className="text-[11px] italic text-muted-foreground">
                As you talk, what Chronicle captures — the chapters you touch, the
                memories distilled, and what stands out — appears here.
              </p>
            ) : (
              <div className="space-y-3">
                {insight.modulesTouched.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                      Chapters this session
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {insight.modulesTouched.map((m) => (
                        <span
                          key={m}
                          className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {moduleLabel(m)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {insight.capturedTitles.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                      Captured ({insight.capturedTitles.length})
                    </div>
                    <ul className="list-inside list-disc space-y-0.5 text-[11px] text-muted-foreground">
                      {insight.capturedTitles.slice(0, 8).map((t, i) => (
                        <li key={`${t}-${i}`} className="line-clamp-1">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {insight.standouts.length > 0 && (
                  <div>
                    <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                      What stands out
                    </div>
                    <ul className="space-y-1 text-[11px] italic text-muted-foreground">
                      {insight.standouts.slice(-3).map((s, i) => (
                        <li key={`${s}-${i}`}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

export default ChronicleChatPanel
