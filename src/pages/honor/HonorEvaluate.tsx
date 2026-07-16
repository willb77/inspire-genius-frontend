import { useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Sparkles,
  Send,
  Target,
  GraduationCap,
  Landmark,
  Calculator,
  Users,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { sanitizeBodyHtml } from "@/lib/sanitizeHtml"
import { useCaseload } from "@/hooks/honor/useCoachData"
import { useHonorEvaluate } from "@/hooks/honor/useHonorEvaluate"
import {
  MOCK_COMPARE_METRICS,
  MOCK_EVAL_ANSWERS,
  MOCK_EVAL_PROMPTS,
  MOCK_SUGGESTED_GOALS,
  USE_HONOR_EVAL_LIVE,
} from "@/hooks/honor/mocks"
import type { EvaluateAnswer } from "@/types/honor"
import {
  AgentTraceRow,
  HonorCard,
  HonorMeter,
  HonorPageHeader,
  HonorPill,
  HonorSectionTitle,
} from "./_shared"
import { HONOR_BTN_OUTLINE, HONOR_BTN_PRIMARY, fellowName } from "./_format"

/**
 * Honor Coach Workbench — Evaluate Member (core AI surface).
 *
 * The biggest wiring lift. Wiring target: the coach's free-text prompt drives a
 * multi-agent DAG (Aura → James → Nova → Meridian) that analyses a SELECTED
 * member (not the coach) — a net-new "coach evaluates a member" invocation over
 * the existing Meridian orchestration. Compare matrix, goals (Ascend →
 * user_milestones), education (Echo/Bridge), funding (Grant), and the ROI model
 * are all agent-backed in the target. Phase-0 scaffold: canned Meridian answers
 * with agent traces + mock compare scores. Chat HTML is sanitized on render.
 *
 * PR B: the chat is wired to the live Meridian async-jobs transport
 * (useHonorEvaluate → POST /v1/agents/chat/async, context.surface="honor") when
 * USE_HONOR_EVAL_LIVE is on, with a graceful fallback to the seeded classifier
 * on error/timeout so the surface never breaks. Compare/goals/education/funding/
 * ROI panels remain seeded (Phase-2 wiring).
 */

type Scope = "individual" | "team"
type ChatTurn = { role: "coach" | "meridian"; text?: string; answer?: EvaluateAnswer; pending?: boolean }

/** Naive keyword classifier over the seeded answers (fallback when live is off/errors). */
function classify(prompt: string): EvaluateAnswer {
  const p = prompt.toLowerCase()
  if (p.includes("struggle") || p.includes("weak") || p.includes("risk"))
    return MOCK_EVAL_ANSWERS.find((a) => a.key === "struggle")!
  if (p.includes("client") || p.includes("leadership"))
    return MOCK_EVAL_ANSWERS.find((a) => a.key === "insight")!
  if (p.includes("pair") || p.includes("pod") || p.includes("complement"))
    return MOCK_EVAL_ANSWERS.find((a) => a.key === "plan")!
  return MOCK_EVAL_ANSWERS.find((a) => a.key === "fit")!
}

/** Wrap Meridian's synthesized reply (plain text/markdown) into an EvaluateAnswer. */
function liveAnswer(question: string, content: string, trace: string[]): EvaluateAnswer {
  const esc = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const html = esc
    .split(/\n\n+/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("")
  return { key: "live", question, trace: trace.length ? trace : ["Meridian"], html }
}

export default function HonorEvaluate() {
  const { data: fellows = [] } = useCaseload()
  const evaluate = useHonorEvaluate()
  const [scope, setScope] = useState<Scope>("individual")
  const [selected, setSelected] = useState<Set<string>>(new Set(["2201", "2205"]))
  const [input, setInput] = useState("")
  const [thread, setThread] = useState<ChatTurn[]>([])

  const selectedFellows = useMemo(
    () => fellows.filter((f) => selected.has(f.id)),
    [fellows, selected]
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function ask(prompt: string) {
    const q = prompt.trim()
    if (!q) return
    setInput("")

    // Mock mode (or no member selected for context): use the seeded classifier.
    if (!USE_HONOR_EVAL_LIVE) {
      setThread((prev) => [
        ...prev,
        { role: "coach", text: q },
        { role: "meridian", answer: classify(q) },
      ])
      return
    }

    // Live: append the coach turn + a pending placeholder, then call Meridian
    // (async-jobs). On success swap in the real reply; on error fall back to the
    // canned answer so the surface never breaks.
    const memberId = selectedFellows[0]?.id
    setThread((prev) => [...prev, { role: "coach", text: q }, { role: "meridian", pending: true }])
    try {
      const reply = await evaluate.mutateAsync({ prompt: q, memberId })
      const answer = reply.content.trim()
        ? liveAnswer(q, reply.content, reply.trace)
        : classify(q)
      setThread((prev) => {
        const next = [...prev]
        const i = next.map((t) => t.pending).lastIndexOf(true)
        if (i >= 0) next[i] = { role: "meridian", answer }
        return next
      })
    } catch {
      setThread((prev) => {
        const next = [...prev]
        const i = next.map((t) => t.pending).lastIndexOf(true)
        if (i >= 0) next[i] = { role: "meridian", answer: classify(q) }
        return next
      })
    }
  }

  // Compare matrix — only metrics with scores for the selected members.
  const compareRows = useMemo(() => {
    const ids = selectedFellows.map((f) => f.id)
    return MOCK_COMPARE_METRICS.map((m) => ({
      label: m.label,
      cells: ids.map((id) => ({ id, value: m.scores[id] ?? 0 })),
    }))
  }, [selectedFellows])

  return (
    <div>
      <HonorPageHeader
        icon={Sparkles}
        title="Evaluate Member"
        description="Ask Meridian about a member or compare a pod. Every answer shows the agent trace behind it."
      />

      {/* Scope + member picker */}
      <HonorCard className="mb-6">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <div className="inline-flex rounded-lg border border-[#dfe4ec] bg-white p-0.5">
            {(["individual", "team"] as Scope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                  scope === s ? "bg-[#1B2A4A] text-white" : "text-[#5b6678] hover:bg-[#f6f7f9]"
                )}
              >
                {s === "individual" ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                {s === "individual" ? "Individual" : "Whole team"}
              </button>
            ))}
          </div>
          <span className="text-sm text-[#9299a6]">
            {selectedFellows.length} selected
          </span>
        </div>

        <HonorSectionTitle>Members</HonorSectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fellows.map((f) => {
            const on = selected.has(f.id)
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.id)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  on
                    ? "border-[#E8792B] bg-[rgba(232,121,43,0.06)]"
                    : "border-[#dfe4ec] bg-white hover:border-[#c6cdd9]"
                )}
              >
                <span>
                  <span className="font-medium text-[#18202f]">
                    {fellowName(f.firstName, f.lastName)}
                  </span>
                  <span className="block text-xs text-[#9299a6]">{f.target}</span>
                </span>
                {f.prism && <HonorPill tone="navy">{f.prism.label}</HonorPill>}
              </button>
            )
          })}
        </div>
      </HonorCard>

      {/* Chat with Meridian */}
      <HonorCard className="mb-6">
        <HonorSectionTitle>Chat with Meridian</HonorSectionTitle>

        <div className="mb-3 flex flex-wrap gap-2">
          {MOCK_EVAL_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => void ask(p)}
              className="rounded-full border border-[#dfe4ec] bg-white px-3 py-1 text-xs font-medium text-[#5b6678] transition-colors hover:border-[#E8792B] hover:text-[#c9631a]"
            >
              {p}
            </button>
          ))}
        </div>

        {thread.length > 0 && (
          <div className="mb-3 space-y-3">
            {thread.map((turn, i) =>
              turn.role === "coach" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg bg-[#1B2A4A] px-3 py-2 text-sm text-white">
                    {turn.text}
                  </div>
                </div>
              ) : turn.pending ? (
                <div key={i} className="max-w-[92%] rounded-lg border border-[#dfe4ec] bg-[#f6f7f9] p-3">
                  <span className="inline-flex items-center gap-2 text-sm text-[#5b6678]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#E8792B]" />
                    Meridian is evaluating…
                  </span>
                </div>
              ) : (
                <div key={i} className="max-w-[92%] rounded-lg border border-[#dfe4ec] bg-[#f6f7f9] p-3">
                  {turn.answer && <AgentTraceRow trace={turn.answer.trace} />}
                  <div
                    className="prose prose-sm mt-2 max-w-none text-sm text-[#18202f] [&_p]:mb-2 [&_strong]:font-semibold"
                    // Meridian-synthesized (or seeded) content; sanitized defense-in-depth.
                    dangerouslySetInnerHTML={{
                      __html: sanitizeBodyHtml(turn.answer?.html ?? ""),
                    }}
                  />
                </div>
              )
            )}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void ask(input)
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a member — e.g. What careers is this member a fit for?"
            className="flex-1 rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
          />
          <button type="submit" className={HONOR_BTN_PRIMARY}>
            <Send className="h-4 w-4" /> Ask
          </button>
        </form>
      </HonorCard>

      {/* Compare matrix (2+ selected) */}
      {selectedFellows.length >= 2 && (
        <HonorCard className="mb-6 p-0">
          <div className="p-5 pb-0">
            <HonorSectionTitle>Compare</HonorSectionTitle>
          </div>
          <div className="overflow-x-auto p-5 pt-2">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-[#5b6678]">
                <tr>
                  <th className="py-2 pr-4">Criteria</th>
                  {selectedFellows.map((f) => (
                    <th key={f.id} className="px-3 py-2">
                      {fellowName(f.firstName, f.lastName)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row) => {
                  const best = Math.max(...row.cells.map((c) => c.value))
                  return (
                    <tr key={row.label} className="border-t border-[#f1f3f7]">
                      <td className="py-3 pr-4 font-medium text-[#18202f]">{row.label}</td>
                      {row.cells.map((c) => (
                        <td key={c.id} className="px-3 py-3">
                          <HonorMeter
                            value={c.value}
                            tone={c.value === best ? "orange" : "navy"}
                            right={`${c.value}`}
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </HonorCard>
      )}

      {/* Coaching outputs grid */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Goal setting */}
        <HonorCard>
          <HonorSectionTitle>Goal Setting</HonorSectionTitle>
          <AgentTraceRow trace={["Ascend", "Meridian"]} />
          <ul className="mt-3 space-y-2">
            {MOCK_SUGGESTED_GOALS.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#f1f3f7] px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm text-[#18202f]">
                  <Target className="h-4 w-4 text-[#E8792B]" /> {g.title}
                </span>
                <button
                  type="button"
                  onClick={() => toast.success("Goal added to user_milestones (stub)")}
                  className="text-xs font-medium text-[#E8792B] hover:underline"
                >
                  Add as goal
                </button>
              </li>
            ))}
          </ul>
        </HonorCard>

        {/* Education & training */}
        <HonorCard>
          <HonorSectionTitle>Education &amp; Training</HonorSectionTitle>
          <AgentTraceRow trace={["Echo", "Bridge", "Meridian"]} />
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2 rounded-lg border border-[#f1f3f7] px-3 py-2">
              <GraduationCap className="h-4 w-4 text-[#1B2A4A]" /> PMP Cert Prep · PMI · 35 hrs · ~$1,200
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-[#f1f3f7] px-3 py-2">
              <GraduationCap className="h-4 w-4 text-[#1B2A4A]" /> Google PM Certificate · Coursera · 6 mo
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-[#f1f3f7] px-3 py-2">
              <GraduationCap className="h-4 w-4 text-[#1B2A4A]" /> UNC Kenan-Flagler MBA (part-time)
            </li>
          </ul>
        </HonorCard>

        {/* Funding */}
        <HonorCard>
          <HonorSectionTitle>Funding Options</HonorSectionTitle>
          <AgentTraceRow trace={["Grant", "Meridian"]} />
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2 rounded-lg border border-[#f1f3f7] px-3 py-2">
              <Landmark className="h-4 w-4 text-[#1B2A4A]" /> Post-9/11 GI Bill
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-[#f1f3f7] px-3 py-2">
              <Landmark className="h-4 w-4 text-[#1B2A4A]" /> DoD SkillBridge
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-[#f1f3f7] px-3 py-2">
              <Landmark className="h-4 w-4 text-[#E8792B]" /> THF partner scholarship grant · up to $5,000
            </li>
          </ul>
        </HonorCard>

        {/* ROI model */}
        <HonorCard>
          <HonorSectionTitle>Job / Career ROI</HonorSectionTitle>
          <AgentTraceRow trace={["Nova", "Grant", "Meridian"]} />
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <Roi icon={Calculator} label="Median first-year comp" value="$96,000" hint="Program Manager (US)" />
            <Roi icon={Landmark} label="Net program cost" value="$0" hint="fully funded" />
            <Roi icon={Target} label="Time to first offer" value="5–7 mo" />
            <Roi icon={Sparkles} label="Behavioral fit" value="Strong · 82%" />
          </div>
        </HonorCard>
      </div>

      {/* Coach status comment */}
      <HonorCard>
        <HonorSectionTitle>Coach Status Comment</HonorSectionTitle>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block font-medium text-[#374151]">Comment</span>
            <textarea
              className="min-h-[70px] w-full resize-y rounded-lg border border-[#dfe4ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#1B2A4A]"
              placeholder="Written to the Activity feed for the selected member or whole team."
            />
          </label>
          <button
            type="button"
            className={HONOR_BTN_OUTLINE}
            onClick={() => toast.success("Status comment saved & written to Activity feed (stub)")}
          >
            Save status
          </button>
        </div>
      </HonorCard>
    </div>
  )
}

function Roi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Calculator
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-[#f1f3f7] p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-[#5b6678]">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-lg font-bold text-[#18202f]">{value}</div>
      {hint && <div className="text-xs text-[#9299a6]">{hint}</div>}
    </div>
  )
}
