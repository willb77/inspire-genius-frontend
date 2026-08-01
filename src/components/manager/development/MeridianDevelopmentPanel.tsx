/**
 * Meridian assistant panel for the Member Development Workspace.
 *
 * Reuses the existing Meridian WebSocket plumbing (`useMeridianWebSocket`) —
 * the same transport `MeridianChat.tsx` uses — scoped to the current member +
 * active tab. WebSocket (not REST) is used so long syntheses bypass the 30s
 * API Gateway ceiling.
 *
 * Any action Meridian proposes (create goal, assign module, add milestone) is
 * STAGED as a confirmable card and only applied when the manager approves it —
 * never auto-applied. Proposals are parsed from an optional fenced
 * ```action { ... }``` block in Meridian's reply.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bot, Send, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/useAuth"
import {
  useMeridianWebSocket,
  type MeridianResponse,
} from "@/hooks/agents/useMeridianWebSocket"
import {
  useLearningPlan,
  useCreateMilestone,
  useGoalSession,
} from "@/hooks/manager/development"
import type { Milestone, SummitGoal, DevelopmentGap } from "@/types/development"
import { useDevSkin } from "./skin"

type DevTab = "profile" | "goals" | "gaps" | "learning" | "careers" | "roadmap"

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
}

export function MeridianDevelopmentPanel({ memberId, memberName, tab, goals, gaps }: MeridianDevelopmentPanelProps) {
  const sk = useDevSkin()
  const { user } = useAuth()
  const accessToken = user?.token ?? ""

  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState("")
  const [staged, setStaged] = useState<ProposedAction | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const learning = useLearningPlan(memberId)
  const milestone = useCreateMilestone(memberId)
  const session = useGoalSession(memberId)

  const onResponse = useCallback((res: MeridianResponse) => {
    if (res.type === "complete" && res.content) {
      const action = parseProposedAction(res.content)
      const text = stripActionBlock(res.content)
      setTurns((prev) => [...prev, { role: "assistant", content: text || "(no response)", id: `a-${Date.now()}` }])
      if (action) setStaged(action)
    }
  }, [])

  const { isConnected, isProcessing, connect, disconnect, sendMessage, currentResponse } =
    useMeridianWebSocket({ onResponse })

  // Connect on mount / token change; disconnect on unmount.
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

  const contextChips = useMemo(
    () => [memberName, `Tab: ${tab}`],
    [memberName, tab],
  )

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setTurns((prev) => [...prev, { role: "user", content: trimmed, id: `u-${Date.now()}` }])
    sendMessage(trimmed, {
      surface: "team_development",
      member_id: memberId,
      active_tab: tab,
      // Real ids so Meridian can propose a create_milestone / assign_learning
      // action bound to an existing goal/gap (never a fabricated id).
      goals: (goals ?? []).map((g) => ({ goalId: g.goalId, title: g.title })),
      gaps: (gaps ?? []).map((g) => ({ gapId: g.gapId, competency: g.competency })),
    })
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
          <div className={cn("flex items-center gap-1 text-[11px]", sk.text400)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-emerald-500" : "bg-slate-300")} aria-hidden="true" />
            {isConnected ? "Connected" : "Connecting…"}
          </div>
        </div>
      </div>

      <div className={cn("flex flex-wrap gap-1.5 border-b px-3 py-2", sk.border100)}>
        {contextChips.map((chip) => (
          <Badge key={chip} variant="secondary" className="text-[10px] capitalize">
            {chip}
          </Badge>
        ))}
      </div>

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
        {isProcessing && currentResponse ? (
          <div className="flex gap-2">
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", sk.accentBgSoft)}>
              <Bot className={cn("h-3.5 w-3.5", sk.accentText)} />
            </span>
            <div className={cn("max-w-[80%] whitespace-pre-wrap rounded-lg p-2 text-xs", sk.bgMuted50, sk.text500)}>
              {stripActionBlock(currentResponse)}
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
