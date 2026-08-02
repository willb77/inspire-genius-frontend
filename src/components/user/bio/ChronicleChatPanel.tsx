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
 * Every turn is also mirrored back. Alongside the chat send (never blocking the
 * reply) the panel calls `POST /v1/agents/bio/{id}/capture`, which extracts and
 * persists what the member just said and returns it structured. That structured
 * reflection renders inline as a "Captured to your profile" card, and its
 * content-specific `suggestedFollowups` become the "Go deeper" chips — so the
 * probes are about what the person actually said ("Tell me about your mother's
 * background"), not a generic rotating script. Before the first turn a tiny
 * starter set stands in until the first capture returns real followups.
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
import { useCaptureBioTurn } from "@/hooks/useCaptureBioTurn"
import CapturedTurnCard from "@/components/user/bio/CapturedTurnCard"
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
  // Structured reflections keyed by the user turn they belong to, so each
  // "Captured to your profile" card renders directly under its own message.
  const [captures, setCaptures] = useState<Record<string, CaptureResponse>>({})
  // Content-specific "Go deeper" chips from the latest capture. Empty until the
  // first turn returns real followups; a starter set stands in until then.
  const [followups, setFollowups] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const onTurnSettledRef = useRef(onTurnSettled)
  onTurnSettledRef.current = onTurnSettled

  const { mutate: captureTurn } = useCaptureBioTurn()

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
      const userTurnId = `u-${Date.now()}`
      setTurns((prev) => [
        ...prev,
        { role: "user", content: trimmed, id: userTurnId },
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
            // Replace the "Go deeper" chips with probes derived from what was
            // just said. On a captured:false / no-followups turn we keep the
            // previous chips rather than blanking the affordance.
            if (res.suggestedFollowups.length > 0) {
              setFollowups(res.suggestedFollowups)
            }
          },
          // A transport failure on the best-effort capture must not surface as
          // an error — the chat reply is unaffected.
          onError: () => {},
        },
      )
    },
    [sendMessage, memberId, suggestedModule, dictation, stopSpeaking, captureTurn],
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

  // "Go deeper" chips: the content-specific followups from the last capture,
  // falling back to a minimal starter set before the first turn returns any.
  const visibleProbes = useMemo(
    () => (followups.length > 0 ? followups : [...STARTER_FOLLOWUPS]),
    [followups],
  )

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
            {/* Structured reflection for this turn, if anything was captured. */}
            {turn.role === "user" && captures[turn.id] ? (
              <CapturedTurnCard capture={captures[turn.id]} />
            ) : null}
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
  )
}

export default ChronicleChatPanel
