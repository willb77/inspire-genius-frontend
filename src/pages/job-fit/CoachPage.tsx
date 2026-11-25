import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { MessagesSquare, Send, Loader2, ExternalLink } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { JOB_FIT_QUESTION_GROUPS, withRole } from "@/constants/job-fit/coachingQuestions"
import { useFitMatches } from "@/hooks/job-fit/useFitMatches"
import { useFitDetail } from "@/hooks/job-fit/useFitDetail"
import { useExplainFit } from "@/hooks/job-fit/useExplainFit"
import { toExplainBody } from "@/services/job-fit/explain.service"
import { FitCard, FitEmptyState, FitPageHeader, FitLoading } from "@/components/fit/primitives"
import { displayFitPercent } from "@/components/fit/fit"
import { FitNoPrismState } from "./FitNoPrismState"

/**
 * Job-Fit coaching — every question is about **you against one of your matched
 * roles**, and the answer appears **right here** on the Job Fit page.
 *
 * Previously this seeded the Meridian chat via router `location.state` and
 * navigated away — which was lost on refresh/remount (so it "didn't work all the
 * time") and felt disconnected from Job Fit. Now it answers inline using the same
 * explain-fit path the detail follow-up uses, grounded in the selected role's own
 * fit numbers. A secondary "Open in Meridian" remains for a deeper conversation.
 */

const selectClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2",
  "focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
)

type QA = { question: string; answer: string }
/** `failed`: the request threw. `degraded`: it answered, but the model did not. */
type AskFailure = "failed" | "degraded"

export default function CoachPage() {
  const { t } = useTranslation("jobFitPages")
  const navigate = useNavigate()
  const matches = useFitMatches("gap")
  const roles = matches.data ?? []

  const [jobId, setJobId] = useState("")
  const [groupKey, setGroupKey] = useState(JOB_FIT_QUESTION_GROUPS[0].key)
  const [custom, setCustom] = useState("")
  const [history, setHistory] = useState<QA[]>([])
  const [error, setError] = useState<AskFailure | null>(null)

  const detailQuery = useFitDetail(jobId || undefined)
  const detail = detailQuery.data
  const explain = useExplainFit()
  const group =
    JOB_FIT_QUESTION_GROUPS.find((g) => g.key === groupKey) ?? JOB_FIT_QUESTION_GROUPS[0]
  const roleTitle = detail?.roleTitle ?? roles.find((r) => r.jobId === jobId)?.roleTitle ?? ""
  const canAsk = Boolean(detail) && !explain.isPending

  async function ask(raw: string) {
    const q = withRole(raw, roleTitle).trim()
    if (!q || !detail) return
    setError(null)
    const pct = displayFitPercent(detail)
    try {
      const res = await explain.mutateAsync(toExplainBody(detail, pct, q))
      // NP3 (C2-a): a failed model call is said, never dressed as an answer.
      if (res.degraded === true) {
        setError("degraded")
        return
      }
      const answer = (res.answer || "").trim() || res.overview
      setHistory((prev) => [...prev, { question: q, answer }])
      setCustom("")
    } catch {
      setError("failed")
    }
  }

  function openInMeridian(raw: string) {
    const text = withRole(raw, roleTitle).trim()
    if (!text) return
    navigate(ROUTES.MERIDIAN_CHAT, { state: { prefillPrompt: text, autoSubmit: true } })
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <FitPageHeader
        icon={MessagesSquare}
        title={t("coachPage.title", "Coaching")}
        description={t(
          "coachPage.description",
          "Work through one of your roles — fit, growth areas, how to develop them, goals, and interview prep. Pick a role and a question; the answer appears right here.",
        )}
      />

      {matches.isLoading ? (
        <FitLoading label={t("coachPage.loadingRoles", "Loading your roles…")} />
      ) : roles.length === 0 && matches.emptyReason === "no_prism" ? (
        // NP3 / walk F-W3-1: no roles because no PRISM — say so, link to PRISM.
        <FitNoPrismState surface="coach" />
      ) : roles.length === 0 ? (
        <FitEmptyState>
          <p className="mb-3">{t("coachPage.noRoles", "No matched roles yet.")}</p>
          <Button type="button" onClick={() => navigate(ROUTES.JOB_FIT.MATCHES)}>
            {t("coachPage.seeMatches", "See your role matches")}
          </Button>
        </FitEmptyState>
      ) : (
        <div className="space-y-4">
          <FitCard className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fit_role">{t("coachPage.whichRole", "Which role are we talking about?")}</Label>
              <select
                id="fit_role"
                value={jobId}
                onChange={(e) => {
                  setJobId(e.target.value)
                  setHistory([])
                }}
                className={selectClass}
              >
                <option value="">{t("coachPage.chooseRole", "Choose a role…")}</option>
                {roles.map((r) => (
                  <option key={r.jobId} value={r.jobId}>
                    {r.roleTitle}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("coachPage.grounded", "Answers are grounded in your fit against this role.")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fit_category">{t("coachPage.whatWork", "What do you want to work on?")}</Label>
              <select
                id="fit_category"
                value={groupKey}
                onChange={(e) => setGroupKey(e.target.value)}
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
              <Label htmlFor="fit_question">{t("coachPage.question", "Question")}</Label>
              <select
                id="fit_question"
                value=""
                onChange={(e) => {
                  if (e.target.value) ask(e.target.value)
                }}
                disabled={!canAsk}
                className={selectClass}
              >
                <option value="">
                  {detailQuery.isLoading
                    ? t("coachPage.loadingRole", "Loading this role…")
                    : canAsk
                      ? t("coachPage.pickQuestion", "Pick a question to answer it here…")
                      : t("coachPage.chooseRoleFirst", "Choose a role first…")}
                </option>
                {group.questions.map((q) => (
                  <option key={q} value={q}>
                    {withRole(q, roleTitle)}
                  </option>
                ))}
              </select>
            </div>
          </FitCard>

          {/* Answers render inline, right here in Job Fit */}
          {(explain.isPending || history.length > 0 || error) && (
            <FitCard className="space-y-3">
              {history.map((qa, i) => (
                <div key={i} className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
                  <div className="mb-1.5 flex items-start gap-2">
                    <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" />
                    <span className="text-sm font-medium text-[#1f2937]">{qa.question}</span>
                  </div>
                  <p className="whitespace-pre-line pl-6 text-sm leading-relaxed text-[#374151]">
                    {qa.answer}
                  </p>
                </div>
              ))}
              {explain.isPending && (
                <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("coachPage.thinking", "Thinking about your fit…")}
                </div>
              )}
              {error === "failed" && (
                <p role="alert" className="text-sm text-[#b91c1c]">
                  {t(
                    "coachPage.error",
                    "That didn't go through — please try again in a moment.",
                  )}
                </p>
              )}
              {error === "degraded" && (
                <p role="alert" className="text-sm text-[#b91c1c]">
                  {t(
                    "coachPage.degraded",
                    "The coach couldn't answer just now. Your fit figures are unchanged. Please ask again in a minute.",
                  )}
                </p>
              )}
            </FitCard>
          )}

          <FitCard className="space-y-3">
            <Label htmlFor="fit_custom">{t("coachPage.askOwn", "Or ask your own")}</Label>
            <Textarea
              id="fit_custom"
              rows={3}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={t(
                "coachPage.customPlaceholder",
                "Anything else you want to work through about this role…",
              )}
              disabled={!canAsk}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => ask(custom)}
                disabled={!canAsk || custom.trim().length === 0}
              >
                {explain.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="mr-2 h-4 w-4" aria-hidden />
                )}
                {t("coachPage.answerHere", "Answer here")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openInMeridian(custom || group.questions[0])}
                disabled={!roleTitle}
                title={t("coachPage.openMeridianTitle", "Continue this in a full Meridian conversation")}
              >
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                {t("coachPage.openMeridian", "Open in Meridian")}
              </Button>
            </div>
          </FitCard>
        </div>
      )}
    </div>
  )
}
