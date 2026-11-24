/**
 * A goal's roadmap toward the role it targets (Goals Studio Feeds Phase 3).
 *
 * Deterministic: the milestones are the fit's gaps in the order Direction
 * Setting's plan uses (priority gaps first, then the largest miss), each
 * behaviour milestone quoting the PRISM definition of its dimension. The start
 * is the goal's own first step and the finish its success metric — when either
 * is missing the page says so rather than inventing one.
 *
 * Dark unless the server's `goal_targets` switch is on.
 */
import { Link, useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowLeft, Flag, Loader2, MessageSquareText, RefreshCw, X } from "lucide-react"
import { PageHead, Card, CardH, Callout, MiniLabel } from "@/pages/summit/components/ui"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import { useGoalTargetsEnabled } from "@/hooks/switches/useGoalTargetsEnabled"
import { usePracticeScoredEnabled } from "@/hooks/switches/usePracticeScoredEnabled"
import type { PracticeRoleSeed } from "@/types/interviewRolePage"
import { useRebuildRoadmap, useRemoveTarget, useRoadmap } from "@/hooks/goals/useGoalTargets"
import { targetErrorText } from "@/pages/summit/_targets"
import type { RoadmapMilestone } from "@/types/goals/targets"
import { withPrism } from "@/lib/withPrism"

function Milestone({ m }: { m: RoadmapMilestone }) {
  const { t } = useTranslation("summitPages")
  const priority = m.severity === "critical"
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-wide">
        <span className="text-[#7C93B5]">{t("roadmap.step", { defaultValue: "Step {{rank}}", rank: m.rank })}</span>
        {priority && <span className="rounded bg-[#C2614F]/10 px-1.5 py-0.5 text-[#C2614F]">{t("roadmap.priority", { defaultValue: "Priority" })}</span>}
      </div>
      <div className="mt-1 text-[15px] font-bold text-[#0B1B33]">{m.title || m.competency}</div>
      {m.why && <p className="mt-1.5 text-[13.5px] leading-snug text-[#13294B]">{m.why}</p>}
      {m.canon && (
        <p className="mt-2 border-l-[3px] border-[#127A8A] pl-2.5 text-[12.5px] leading-snug text-[#13294B]/80">
          <b>{withPrism(t("roadmap.inPrism", { defaultValue: "{{dimension}} in PRISM:", dimension: m.canon.dimension }))}</b> {m.canon.definition}
        </p>
      )}
    </li>
  )
}

export default function GoalRoadmapPage() {
  const { t } = useTranslation("summitPages")
  const { goalId } = useParams<{ goalId: string }>()
  const navigate = useNavigate()
  const on = useGoalTargetsEnabled()
  const practiceOn = usePracticeScoredEnabled()
  const q = useRoadmap(goalId, on)
  const rebuild = useRebuildRoadmap()
  const remove = useRemoveTarget()
  const error = rebuild.error ?? remove.error

  const back = (
    <Link
      to={ROUTES.MY_GOALS.BASE}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#13294B]/70 hover:text-[#0E5F6B]"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> {t("roadmap.back", { defaultValue: "Back to my goals" })}
    </Link>
  )

  if (!on) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Callout tone="info">{t("roadmap.unavailable", { defaultValue: "Goal roadmaps aren't available yet." })}</Callout>
      </div>
    )
  }

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#13294B]/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t("roadmap.loading", { defaultValue: "Loading your roadmap…" })}
      </div>
    )
  }

  if (q.isError || !q.data) {
    const notFound = (q.error as { response?: { status?: number } } | null)?.response?.status === 404
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Callout tone="info">
          {notFound
            ? t("roadmap.notFound", { defaultValue: "This goal doesn't target a role. Open a role in Job Fit and choose “Make this my target”." })
            : t("roadmap.loadError", { defaultValue: "We couldn't load this roadmap. Please try again shortly." })}
        </Callout>
      </div>
    )
  }

  const { target } = q.data
  const r = q.data.roadmap?.roadmap
  const role = r?.targetRole?.title || target.roleTitle || t("roadmap.thisRole", { defaultValue: "this role" })

  return (
    <div className="flex flex-col gap-5">
      {back}
      <PageHead
        eyebrow={t("roadmap.eyebrow", { defaultValue: "Roadmap" })}
        title={r?.goalTitle ?? t("roadmap.defaultTitle", { defaultValue: "Your roadmap" })}
        sub={t("roadmap.sub", { defaultValue: "Toward {{role}}. Built from the fit you were looking at when you chose it.", role })}
      />

      {!r && <Callout tone="info">{t("roadmap.noRoadmap", { defaultValue: "No roadmap has been built for this target yet." })}</Callout>}

      {r && (
        <>
          <Card>
            <MiniLabel>{t("roadmap.start", { defaultValue: "Start" })}</MiniLabel>
            {r.start.firstStep ? (
              <p className="mt-1 text-[14px] text-[#0B1B33]">{r.start.firstStep}</p>
            ) : (
              <p className="mt-1 text-[13.5px] text-[#13294B]/70">
                {t("roadmap.noFirstStep", { defaultValue: "This goal has no first step yet — the steps below are where the gaps are." })}
              </p>
            )}
          </Card>

          {r.gapsPending ? (
            <Callout tone="sage">
              {t("roadmap.noGaps", { defaultValue: "The fit you chose this role from showed no gaps to close — nothing stands between your profile and this role's benchmark." })}
            </Callout>
          ) : (
            <section aria-labelledby="milestones-heading">
              <CardH>
                <span id="milestones-heading">{t("roadmap.steps", { defaultValue: "Steps" })}</span>
              </CardH>
              <ol className="flex flex-col gap-3">
                {r.milestones.map((m) => (
                  <Milestone key={m.itemId} m={m} />
                ))}
              </ol>
              <p className="mt-2 text-[12px] text-[#13294B]/60">{r.sequenceBasis}</p>
            </section>
          )}

          <Card>
            <MiniLabel>{t("roadmap.finish", { defaultValue: "Finish" })}</MiniLabel>
            {r.finish.successMetric ? (
              <p className="mt-1 flex items-center gap-2 text-[14px] text-[#0B1B33]">
                <Flag className="h-4 w-4 text-[#C88B1B]" aria-hidden /> {r.finish.successMetric}
              </p>
            ) : (
              <p className="mt-1 text-[13.5px] text-[#13294B]/70">
                {t("roadmap.noFinish", { defaultValue: "This goal has no success measure yet, so the roadmap has no finish line." })}
              </p>
            )}
          </Card>

          {r.advisories.overdone.length > 0 && (
            <Callout tone="info">
              {t("roadmap.overuse", { defaultValue: "Watch for over-use of {{dimensions}} in this role.", dimensions: r.advisories.overdone.map((o) => o.dimension).filter(Boolean).join(", ") })}
            </Callout>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-[#F1ECE2] pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={rebuild.isPending || remove.isPending}
          onClick={() => goalId && rebuild.mutate(goalId)}
        >
          <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden /> {t("roadmap.rebuild", { defaultValue: "Rebuild roadmap" })}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={rebuild.isPending || remove.isPending}
          onClick={() =>
            goalId && remove.mutate(goalId, { onSuccess: () => navigate(ROUTES.MY_GOALS.BASE) })
          }
        >
          <X className="mr-1 h-3.5 w-3.5" aria-hidden /> {t("roadmap.stopTargeting", { defaultValue: "Stop targeting this role" })}
        </Button>
        {practiceOn && goalId && (
          // 3.4 P4 — practise an interview for this role; the result is linked
          // to this goal. Shown only while scored practice is on for the tier.
          <Button asChild variant="outline" size="sm">
            <Link
              to={ROUTES.INTERVIEW_PRACTICE}
              state={{ roleTitle: r?.targetRole?.title || target.roleTitle || "", jobDescription: "", goalId } satisfies PracticeRoleSeed}
            >
              <MessageSquareText className="mr-1 h-3.5 w-3.5" aria-hidden /> {t("roadmap.practise", { defaultValue: "Practise for this role" })}
            </Link>
          </Button>
        )}
        {(rebuild.isPending || remove.isPending) && (
          <Loader2 className="h-4 w-4 animate-spin text-[#7C93B5]" aria-hidden />
        )}
      </div>
      {error && (
        <p role="alert" className="text-[12.5px] text-[#C2614F]">
          {targetErrorText(error, t)}
        </p>
      )}
    </div>
  )
}
