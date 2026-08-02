/**
 * Chronicle chat panel for the Bio Capture surface.
 *
 * Reuses the existing Meridian WebSocket plumbing (`useMeridianWebSocket`) — the
 * same transport `MeridianChat.tsx` uses — so long syntheses bypass the 30s API
 * Gateway ceiling. There is no separate "Chronicle socket": Chronicle is a
 * coaching specialist Meridian routes to on bio/life-story keywords, so the
 * panel seeds a bio-oriented context (`surface: "bio_capture"`) and bio-flavoured
 * suggested prompts, and Meridian's router lands on Chronicle. Every reply is
 * still delivered in Meridian's unified voice — that is the platform contract.
 *
 * Voice mode (additive; text mode stays fully working) mirrors the Interview
 * Practice voice interface: `useTTS` reads Chronicle's newest reply aloud and
 * `useSpeechDictation` transcribes a spoken answer into the input for review
 * before sending. Both degrade gracefully — if speech recognition is
 * unavailable the mic is disabled with an explanation and typing still works;
 * if TTS is unavailable it degrades silently to text.
 *
 * "Go deeper" probes draw the storyteller out: a small rotating set of episodic
 * questions (from the life-story method's episodic-anchoring set) that, when
 * tapped, are sent as the member's steer so a generalization becomes one
 * specific, sensory scene.
 *
 * The panel is intentionally lightweight (no document attach): the heavy
 * MeridianChat page owns that. When a turn settles we tell the parent so it can
 * refetch the narrative — a distilled episode from this conversation is exactly
 * what should appear in the viewer beside it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bot, Mic, MicOff, Send, User, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import {
  useMeridianWebSocket,
  type MeridianResponse,
} from "@/hooks/agents/useMeridianWebSocket"

type ChatTurn = { role: "user" | "assistant"; content: string; id: string }

const SUGGESTED_PROMPTS = [
  "I'd like to start telling my life story.",
  "Help me capture a major event that shaped me.",
  "Ask me about my background and where I grew up.",
  "What haven't we talked about yet?",
]

/**
 * Episodic-anchoring probes — the ones that turn a generalization into one
 * specific scene. Rotated a few at a time so the panel nudges without clutter.
 */
const DEEPER_PROBES = [
  "What did you notice first?",
  "What were you thinking but didn't say?",
  "Where were you — who else was there?",
  "What happened in the ten minutes after?",
  "Was that typical, or the one time?",
  "Tell me about one specific time it happened.",
  "What would a stranger standing there not have understood?",
  "When was the last time that happened?",
] as const

const PROBES_SHOWN = 3

export type ChronicleChatPanelProps = {
  memberId: string
  /** Called when an assistant turn settles, so the parent can refetch the narrative. */
  onTurnSettled?: () => void
  /** Which module the viewer is nudging the member toward, forwarded as context. */
  suggestedModule?: string | null
  /**
   * Lets the parent drive the chat: the panel registers a `seed(moduleType)`
   * function here so the viewer's "Continue with Chronicle" CTA can open that
   * chapter as a sent message. The function is registered on mount and cleared
   * on unmount.
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
  const [probeOffset, setProbeOffset] = useState(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const onTurnSettledRef = useRef(onTurnSettled)
  onTurnSettledRef.current = onTurnSettled

  const onResponse = useCallback((res: MeridianResponse) => {
    if (res.type === "complete" && res.content) {
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: res.content ?? "", id: `a-${Date.now()}` },
      ])
      onTurnSettledRef.current?.()
    }
  }, [])

  const {
    isConnected,
    isProcessing,
    connect,
    disconnect,
    sendMessage,
    currentResponse,
  } = useMeridianWebSocket({ onResponse })

  // ── Voice: read Chronicle's reply aloud + capture the spoken answer ──────────
  const { speak, stop: stopSpeaking, speaking } = useTTS({ voice: "coral" })
  const dictation = useSpeechDictation({
    onFinal: (chunk) =>
      // Review-then-send (matches Interview Practice): the transcript lands in
      // the input so the member can tidy it before sending.
      setInput((prev) => (prev ? `${prev} ${chunk}` : chunk)),
  })

  // Speak each newly-settled assistant turn once, only while voice mode is on.
  const spokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (!voiceMode) return
    const last = turns[turns.length - 1]
    if (last && last.role === "assistant" && spokenRef.current !== last.id) {
      spokenRef.current = last.id
      void speak(last.content)
    }
  }, [voiceMode, turns, speak])

  // Connect on mount / token change; disconnect on unmount. The small delay
  // mirrors MeridianDevelopmentPanel — it lets the token settle before the
  // socket opens.
  useEffect(() => {
    if (!accessToken) return
    const timer = setTimeout(() => connect(accessToken), 300)
    return () => {
      clearTimeout(timer)
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [turns, currentResponse])

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      // A new steer ends any in-flight listening/speaking so the turns don't
      // talk over each other.
      dictation.stop()
      stopSpeaking()
      setTurns((prev) => [
        ...prev,
        { role: "user", content: trimmed, id: `u-${Date.now()}` },
      ])
      sendMessage(trimmed, {
        // Steer Meridian's router to the Chronicle coaching specialist and give
        // it the member + current focus. `surface` is the same convention the
        // Team Development panel uses.
        surface: "bio_capture",
        agent_hint: "chronicle",
        member_id: memberId,
        suggested_module: suggestedModule ?? undefined,
      })
      setInput("")
      // Advance the rotating probe window so the next nudge feels fresh.
      setProbeOffset((o) => (o + PROBES_SHOWN) % DEEPER_PROBES.length)
    },
    [sendMessage, memberId, suggestedModule, dictation, stopSpeaking],
  )

  // Expose a seed function so the viewer's "Continue with Chronicle" CTA can
  // open a chapter as a sent message.
  useEffect(() => {
    if (!registerSeed) return
    registerSeed((moduleType: string) =>
      send(`Let's talk about my ${moduleLabel(moduleType).toLowerCase()}.`),
    )
    return () => registerSeed(null)
  }, [registerSeed, send])

  // The rotating window of "go deeper" probes.
  const visibleProbes = useMemo(() => {
    return Array.from(
      { length: PROBES_SHOWN },
      (_, i) => DEEPER_PROBES[(probeOffset + i) % DEEPER_PROBES.length],
    )
  }, [probeOffset])

  const cycleProbes = useCallback(() => {
    setProbeOffset((o) => (o + PROBES_SHOWN) % DEEPER_PROBES.length)
  }, [])

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

  return (
    <div
      className={cn(
        "flex h-full min-h-[28rem] flex-col overflow-hidden rounded-lg border bg-card",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b p-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold">Chronicle</div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isConnected ? "bg-emerald-500" : "bg-slate-300",
              )}
              aria-hidden="true"
            />
            {isConnected ? "Connected" : "Connecting…"}
          </div>
        </div>

        {/* Voice / Text toggle */}
        <div className="ml-auto flex items-center gap-1.5">
          <Volume2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <Label htmlFor="chronicle-voice-mode" className="text-[11px] text-muted-foreground">
            Voice
          </Label>
          <Switch
            id="chronicle-voice-mode"
            checked={voiceMode}
            onCheckedChange={toggleVoiceMode}
            aria-label="Voice mode: read Chronicle's questions aloud and answer by speaking"
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {turns.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Chronicle helps you tell your story, one memory at a time. Start
              anywhere:
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
            <div
              key={turn.id}
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
                        onClick={() => (speaking ? stopSpeaking() : void speak(turn.content))}
                        aria-label={speaking ? "Stop reading aloud" : "Read this reply aloud"}
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
          ))
        )}
        {isProcessing && currentResponse ? (
          <div className="flex gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-3.5 w-3.5 text-primary" aria-hidden />
            </span>
            <div className="max-w-[80%] rounded-lg bg-muted/50 p-2 text-xs text-muted-foreground">
              <AssistantMarkdown text={currentResponse} className="text-left" />
            </div>
          </div>
        ) : null}
      </div>

      {/* "Go deeper" — episodic probes that draw out one specific, sensory scene. */}
      <div className="border-t px-3 pt-2 pb-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">
            Go deeper
          </span>
          <button
            type="button"
            onClick={cycleProbes}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            aria-label="Show different prompts"
          >
            More prompts
          </button>
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
  )
}

export default ChronicleChatPanel
