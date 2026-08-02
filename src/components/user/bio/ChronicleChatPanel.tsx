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
 * The panel is intentionally lightweight (no audio, no document attach): the
 * heavy MeridianChat page owns those. When a turn settles we tell the parent so
 * it can refetch the narrative — a distilled episode from this conversation is
 * exactly what should appear in the viewer beside it.
 */
import { useCallback, useEffect, useRef, useState } from "react"
import { Bot, Send, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/useAuth"
import AssistantMarkdown from "@/components/user/chat/AssistantMarkdown"
import { moduleLabel } from "@/lib/bio/clientMemoir"
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
    },
    [sendMessage, memberId, suggestedModule],
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
        <div>
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
                  <AssistantMarkdown text={turn.content} className="text-left" />
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

      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tell Chronicle a memory…"
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
