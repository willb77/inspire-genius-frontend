import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { MessagesSquare, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { JOB_FIT_QUESTION_GROUPS, withRole } from "@/constants/job-fit/coachingQuestions"
import { useSavedRoles } from "@/hooks/knowledge-continuity/useSavedRoles"
import { FitCard, FitEmptyState, FitPageHeader } from "./_shared"

/**
 * Job-Fit coaching — every question is about **you against one selected role**.
 *
 * This is the vertical's answer to "what do I do with the fit score?". Picking a
 * role and a question injects it into Meridian and auto-submits, so the
 * conversation opens already knowing what it is comparing you against instead of
 * spending the first exchange establishing it.
 *
 * Reuses the platform Meridian chat surface rather than adding a chat of its own:
 * navigation carries `{ prefillPrompt, autoSubmit }`, the same one-shot mechanism
 * HomeV2's starter questions use — `MeridianChat` consumes it at mount, submits
 * once, and clears the history state so a refresh can't resend.
 *
 * Meridian is never bypassed; she routes to whichever specialist the question
 * needs, which is why this page seeds a question rather than calling an agent.
 */

const BLUEPRINT_ORG_ID = "job-fit"

const selectClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
)

export default function CoachPage() {
  const navigate = useNavigate()
  const savedRoles = useSavedRoles(BLUEPRINT_ORG_ID)
  const roles = savedRoles.data ?? []

  const [roleTitle, setRoleTitle] = useState("")
  const [groupKey, setGroupKey] = useState(JOB_FIT_QUESTION_GROUPS[0].key)
  const [question, setQuestion] = useState("")
  const [custom, setCustom] = useState("")

  const group =
    JOB_FIT_QUESTION_GROUPS.find((g) => g.key === groupKey) ?? JOB_FIT_QUESTION_GROUPS[0]

  const ask = (raw: string) => {
    const text = withRole(raw, roleTitle).trim()
    if (!text) return
    navigate(ROUTES.MERIDIAN_CHAT, {
      state: { prefillPrompt: text, autoSubmit: true },
    })
  }

  const canAsk = roleTitle.trim().length > 0

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <FitPageHeader
        icon={MessagesSquare}
        title="Coaching"
        description="Work through a specific role with Meridian — fit, gaps, how to close them, goals, and interview prep. Pick a role and a question; it opens the conversation for you."
      />

      {roles.length === 0 ? (
        <FitEmptyState>
          <p className="mb-3">No saved roles yet.</p>
          <Button type="button" onClick={() => navigate(ROUTES.JOB_FIT.BLUEPRINT)}>
            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            Blueprint a role first
          </Button>
        </FitEmptyState>
      ) : (
        <div className="space-y-4">
          <FitCard className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fit_role">Which role are we talking about?</Label>
              <select
                id="fit_role"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className={selectClass}
              >
                <option value="">Choose a role…</option>
                {roles.map((r) => (
                  <option key={r.role_title} value={r.role_title}>
                    {r.role_title}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Every question below is asked about you against this role.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fit_category">What do you want to work on?</Label>
              <select
                id="fit_category"
                value={groupKey}
                onChange={(e) => {
                  setGroupKey(e.target.value)
                  setQuestion("")
                }}
                className={selectClass}
              >
                {JOB_FIT_QUESTION_GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.category}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">{group.blurb}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fit_question">Question</Label>
              <select
                id="fit_question"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value)
                  if (e.target.value) ask(e.target.value)
                }}
                disabled={!canAsk}
                className={selectClass}
              >
                <option value="">
                  {canAsk ? "Pick a question to start the conversation…" : "Choose a role first…"}
                </option>
                {group.questions.map((q) => (
                  <option key={q} value={q}>
                    {withRole(q, roleTitle)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Choosing a question opens Meridian and asks it for you.
              </p>
            </div>
          </FitCard>

          <FitCard className="space-y-3">
            <Label htmlFor="fit_custom">Or ask your own</Label>
            <Textarea
              id="fit_custom"
              rows={3}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Anything else you want to work through about this role…"
              disabled={!canAsk}
            />
            <Button
              type="button"
              onClick={() => ask(custom)}
              disabled={!canAsk || custom.trim().length === 0}
            >
              <Send className="mr-2 h-4 w-4" aria-hidden />
              Ask Meridian
            </Button>
          </FitCard>
        </div>
      )}
    </div>
  )
}
