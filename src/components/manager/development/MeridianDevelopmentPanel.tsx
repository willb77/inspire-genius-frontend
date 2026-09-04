/**
 * Meridian assistant panel for the Member Development Workspace.
 *
 * Transport is `useMeridianChat` — `POST /v1/agents/chat/async` with the socket
 * as a push accelerator only. It used to send over the WebSocket, which meant
 * that when the tier's ws-proxy turned out to be invoking a dev-named
 * forwarder that does not exist in that account, this panel accepted the
 * manager's question, persisted it, and never answered — with the proxy's
 * error frame discarded because the panel did not read `error`. The async-jobs
 * path polls, so it settles with or without the socket. See
 * `.claude/rules/agents.md` §6.
 *
 * `surface: "team_development"` in the context is load-bearing: the agent-engine
 * reads it in `app/profile/surface_grounding.py` and swaps the injected
 * <USER_PROFILE> to the MEMBER's PRISM. Without it Meridian answers about the
 * manager, fluently, while the header names the member.
 *
 * Any action Meridian proposes (create goal, assign module, add milestone) is
 * STAGED as a confirmable card and only applied when the manager approves it —
 * never auto-applied. Proposals are parsed from an optional fenced
 * ```action { ... }``` block in Meridian's reply.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, Bot, Send, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/useAuth"
import { useMeridianChat } from "@/hooks/agents/useMeridianChat"
import {
  useLearningPlan,
  useCreateMilestone,
  useGoalSession,
  useDossierChat,
  useSaveChatMessage,
} from "@/hooks/manager/development"
import type { Milestone, SummitGoal, DevelopmentGap } from "@/types/development"
import { useDevSkin } from "./skin"

type DevTab =
  | "profile"
  | "goals"
  | "gaps"
  | "learning"
  | "careers"
  | "roadmap"
  // TDS Studio tabs. Present in the union whether or not VITE_FEATURE_TDS_STUDIO
  // is on: the union is what the workspace can PASS, and a prompt set missing
  // for a tab the user is looking at renders an assistant with nothing to
  // suggest, which reads as a broken panel rather than a hidden feature.
  | "profile-studio"
  | "compare"
  | "scenarios"

type ChatTurn = { role: "user" | "assistant"; content: string; id: string }

/** A Meridian-proposed action, staged for manager confirmation. */
type ProposedAction =
  | { type: "invite_summit"; label: string }
  | { type: "assign_learning"; label: string; title: string; goalId?: string; gapId?: string }
  | { type: "create_milestone"; label: string; title: string; goalId: string; horizon: Milestone["horizon"] }

const SUGGESTED_PROMPTS: Record<DevTab, string[]> = {
  profile: ["What should I know before our 1:1?", "How does this person prefer to receive feedback?"],
  goals: ["Which goal should we prioritize and why?", "Draft talking points to co-ratify their top goal."],
  gaps: ["Which gap should we close first and why?", "Suggest a way to frame this gap constructively."],
  learning: ["Recommend a learning sequence for this member.", "What format fits their behavioral style?"],
  careers: ["Draft a 90-day plan for the CSM path.", "Compare their top two internal matches."],
  roadmap: ["Is this roadmap realistic given their pacing?", "What's the single next best action?"],
  "profile-studio": [
    "Summarize this write-up in three lines for my 1:1.",
    "Which part of this should I raise first, and how?",
  ],
  compare: [
    "Where are these two most likely to friction?",
    "Who is better placed to lead the handover, and what would the other need?",
  ],
  scenarios: [
    "What should I watch for when this situation lands?",
    "How would I brief each of them differently?",
  ],
}

function parseProposedAction(content: string): ProposedAction | null {
  const match = content.match(/```action\s*([\s\S]*?)```/)
  if (!match) return null
  try {
    const raw = JSON.parse(match[1].trim()) as Partial<ProposedAction> & { type?: string }
    if (raw.type === "invite_summit") {
      return { type: "invite_summit", label: (raw as { label?: string }).label ?? "Invite to a Summit discovery session" }
    }
    if (raw.type === "assign_learning" && (raw as { title?: string }).title) {
      const r = raw as { title: string; label?: string; goalId?: string; gapId?: string }
      return { type: "assign_learning", label: r.label ?? `Assign learning: ${r.title}`, title: r.title, goalId: r.goalId, gapId: r.gapId }
    }
    if (raw.type === "create_milestone") {
      const r = raw as { title?: string; goalId?: string; horizon?: Milestone["horizon"]; label?: string }
      if (r.title && r.goalId) {
        return {
          type: "create_milestone",
          label: r.label ?? `Add milestone: ${r.title}`,
          title: r.title,
          goalId: r.goalId,
          horizon: r.horizon ?? "d90",
        }
      }
    }
  } catch {
    return null
  }
  return null
}

/** Strip the machine-readable action block from displayed text. */
function stripActionBlock(content: string): string {
  return content.replace(/```action[\s\S]*?```/g, "").trim()
}

export type MeridianDevelopmentPanelProps = {
  memberId: string
  memberName: string
  tab: DevTab
  /** The member's formalized goals + development gaps. Forwarded (id + label
   *  only) to Meridian so it can cite REAL ids in a proposed action block
   *  instead of fabricating them — see _apply_surface_directive in the
   *  agent-engine's meridian.py. */
  goals?: Pick<SummitGoal, "goalId" | "title">[]
  gaps?: Pick<DevelopmentGap, "gapId" | "competency">[]
  /** Goals offering, Phase 2/4: the member has not shared goals with this
   *  caller. The panel then has no goal ids to forward (the dossier is
   *  redacted server-side) and says so in a sentence, rather than letting
   *  the empty list read as "no goals". The server renders its own
   *  <MEMBER_GOALS status="not_shared"> block on the same signal. */
  goalsNotShared?: boolean
}

export function MeridianDevelopmentPanel({ memberId, memberName, tab, goals, gaps, goalsNotShared }: MeridianDevelopmentPanelProps) {
  const sk = useDevSkin()
  const { user } = useAuth()
  const accessToken = user?.token ?? ""

  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState("")
  const [staged, setStaged] = useState<ProposedAction | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const seededRef = useRef(false)

  const learning = useLearningPlan(memberId)
  const milestone = useCreateMilestone(memberId)
  const session = useGoalSession(memberId)

  // Persisted history so the manager can leave and resume the conversation.
  const { data: history } = useDossierChat(memberId)
  const saveChat = useSaveChatMessage(memberId)
  const saveRef = useRef(saveChat.mutate)
  saveRef.current = saveChat.mutate

  // Seed the visible transcript from stored history once, on first load.
  useEffect(() => {
    if (seededRef.current || !history || history.length === 0) return
    seededRef.current = true
    setTurns(
      history.map((m, i) => ({ role: m.role, content: m.content, id: `h-${i}` })),
    )
  }, [history])

  const onAssistant = useCallback((raw: string) => {
    const action = parseProposedAction(raw)
    const content = stripActionBlock(raw) || "(no response)"
    setTurns((prev) => [...prev, { role: "assistant", content, id: `a-${Date.now()}` }])
    // Persist Meridian's reply so it survives navigation (fire-and-forget).
    saveRef.current({ role: "assistant", content })
    if (action) setStaged(action)
  }, [])

  const { send: sendToMeridian, isProcessing, partial, error, clearError } = useMeridianChat({
    sessionKey: memberId,
    accessToken,
    // `surface` + `member_id` drive the member-profile grounding in the
    // agent-engine; `member_name` saves it a roster lookup. Real goal/gap ids
    // so a proposed action binds to an existing row, never a fabricated one.
    context: {
      surface: "team_development",
      member_id: memberId,
      member_name: memberName,
      active_tab: tab,
      goals: (goals ?? []).map((g) => ({ goalId: g.goalId, title: g.title })),
      gaps: (gaps ?? []).map((g) => ({ gapId: g.gapId, competency: g.competency })),
    },
    onAssistant,
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [turns, partial, error])

  const contextChips = useMemo(
    () => [memberName, `Tab: ${tab}`],
    [memberName, tab],
  )
  const goalsNotSharedLine = goalsNotShared
    ? `${memberName || "This member"} has not shared their goals with you, so Meridian cannot see them either.`
    : null

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setTurns((prev) => [...prev, { role: "user", content: trimmed, id: `u-${Date.now()}` }])
    saveChat.mutate({ role: "user", content: trimmed })
    // `active_tab` is passed per-send as well as in the base context so a tab
    // change between renders can't send a stale one.
    void sendToMeridian(trimmed, { active_tab: tab })
    setInput("")
  }

  const applyStaged = () => {
    if (!staged) return
    if (staged.type === "invite_summit") session.mutate("invite")
    else if (staged.type === "assign_learning") {
      learning.mutate({ title: staged.title, goalId: staged.goalId, gapId: staged.gapId })
    } else if (staged.type === "create_milestone") {
      milestone.mutate({ goalId: staged.goalId, title: staged.title, horizon: staged.horizon })
    }
    setStaged(null)
  }

  return (
    <div className={cn("flex h-full flex-col border bg-white", sk.radius, sk.border200)}>
      <div className={cn("flex items-center gap-2 border-b p-3", sk.border100)}>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-white", sk.avatarGradient)}>
          <Bot className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <div className={cn("text-sm font-semibold", sk.text800)}>Meridian</div>
          {/* Deliberately NOT a socket indicator. The old dot read "Connected"
              off the WebSocket while the panel was incapable of answering —
              the transport it described had stopped being the one that carries
              the question. This reports the turn, which is what the manager
              can act on. */}
          <div className={cn("flex items-center gap-1 text-[11px]", sk.text400)}>
            {isProcessing ? "Thinking…" : "Ask about this member"}
          </div>
        </div>
        {/* Continue a Summit goal-discovery session (resume = continue, not a CV). */}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => session.mutate("resume")}
          disabled={session.isPending}
        >
          Continue session
        </Button>
      </div>

      <div className={cn("flex flex-wrap gap-1.5 border-b px-3 py-2", sk.border100)}>
        {contextChips.map((chip) => (
          <Badge key={chip} variant="secondary" className="text-[10px] capitalize">
            {chip}
          </Badge>
        ))}
      </div>
      {goalsNotSharedLine ? (
        <p className={cn("border-b px-3 py-2 text-xs", sk.border200, sk.text500)} data-testid="meridian-goals-not-shared">
          {goalsNotSharedLine}
        </p>
      ) : null}

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {turns.length === 0 ? (
          <div className="space-y-2">
            <p className={cn("text-xs", sk.text400)}>Suggested prompts</p>
            {SUGGESTED_PROMPTS[tab].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                className={cn("block w-full rounded-lg border p-2 text-left text-xs hover:text-slate-900", sk.border200, sk.text600, sk.accentBorderHover)}
              >
                {p}
              </button>
            ))}
          </div>
        ) : (
          turns.map((turn) => (
            <div key={turn.id} className={cn("flex gap-2", turn.role === "user" ? "flex-row-reverse" : "")}>
              <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", turn.role === "user" ? "bg-slate-200" : sk.accentBgSoft)}>
                {turn.role === "user" ? <User className={cn("h-3.5 w-3.5", sk.text500)} /> : <Bot className={cn("h-3.5 w-3.5", sk.accentText)} />}
              </span>
              <div className={cn("max-w-[80%] whitespace-pre-wrap rounded-lg p-2 text-xs", sk.text700, turn.role === "user" ? sk.bgMuted100 : sk.bgMuted50)}>
                {turn.content}
              </div>
            </div>
          ))
        )}
        {isProcessing ? (
          <div className="flex gap-2">
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", sk.accentBgSoft)}>
              <Bot className={cn("h-3.5 w-3.5", sk.accentText)} />
            </span>
            <div className={cn("max-w-[80%] whitespace-pre-wrap rounded-lg p-2 text-xs", sk.bgMuted50, sk.text500)}>
              {partial ? stripActionBlock(partial) : "Thinking…"}
            </div>
          </div>
        ) : null}
        {/* A failed turn must SAY it failed. The predecessor of this panel
            discarded the transport's error frame, so a dead send looked exactly
            like a question nobody had answered yet. */}
        {error ? (
          <div
            role="alert"
            className={cn(
              "flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900",
            )}
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

      {/* Staged action card — manager confirmation required */}
      {staged ? (
        <Card className={cn("m-3", sk.accentBorderSoft, sk.accentBgFaint)}>
          <CardContent className="space-y-2 p-3">
            <div className={cn("text-xs font-semibold", sk.text700)}>Proposed action</div>
            <p className={cn("text-xs", sk.text600)}>{staged.label}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyStaged}>
                Apply
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setStaged(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <form
        className={cn("flex items-center gap-2 border-t p-3", sk.border100)}
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this member…"
          aria-label="Ask Meridian about this member"
          className={cn("flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none", sk.border200, sk.accentBorderFocus)}
        />
        <Button type="submit" size="icon" disabled={!input.trim() || isProcessing}>
          <Send className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  )
}
