import { useState } from "react"
import { Link } from "react-router-dom"
import { Flag, Loader2, Map } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import { useMyGoals } from "@/hooks/summit/useMyGoals"
import { useMakeTarget, useMyTargets } from "@/hooks/goals/useGoalTargets"
import { targetErrorText } from "@/pages/summit/_targets"
import type { FitDetail } from "@/types/job-fit"

const CREATE_NEW = "__new__"

/**
 * Feeds Phase 3 — "Make this my target". Rendered only while the server's
 * `goal_targets` switch is on (the page decides). Aims one of the person's
 * published goals at this role, or creates the role's own goal, stores the fit
 * shown here, and links to the roadmap. Nothing is reported as done until the
 * server has said so.
 */
export function MakeTargetCard({ data }: { data: FitDetail }) {
  const { t } = useTranslation("jobFitPages")
  const mine = useMyGoals()
  const targets = useMyTargets(true)
  const make = useMakeTarget()
  const [choice, setChoice] = useState<string>(CREATE_NEW)

  const goals = mine.data?.goals ?? []
  const already = (targets.data ?? []).filter((tg) => tg.jobId === data.jobId)
  const titleOf = (goalId: string) => goals.find((g) => g.goalId === goalId)?.title ?? t("makeTargetCard.aGoal", "A goal")
  const done = make.data
  // O-CBW-a (2026-11-27): after a make, the targets refetch puts the same goal
  // in the "already" list while the status line still says it "now targets"
  // the role. Show it once — in the status line, which screen readers announce.
  const alreadyShown = done ? already.filter((tg) => tg.goalId !== done.goal.goalId) : already
  // Feeds-F5: once a goal targets this role, the card offers the roadmap, not a
  // second create (which only re-aimed the same goal and rebuilt its roadmap).
  // Held back while the targets list loads so it cannot be clicked first; if
  // that read fails the form stays, since a create then reuses the goal.
  const showForm = !targets.isLoading && already.length === 0

  return (
    <section
      aria-labelledby="make-target-heading"
      className="mb-6 rounded-xl border border-[#0D9488]/30 bg-[#F0FDFA] p-4"
    >
      <h2 id="make-target-heading" className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
        <Flag className="h-4 w-4 text-[#0D9488]" aria-hidden />
        {t("makeTargetCard.title", "Make this my target")}
      </h2>
      <p className="mt-1 text-sm text-[#475569]">
        {t(
          "makeTargetCard.intro",
          "Point one of your goals at this role and get a roadmap toward it, built from the fit shown on this page.",
        )}
      </p>

      {alreadyShown.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-[#0F172A]" aria-label={t("makeTargetCard.alreadyLabel", "Goals already aimed at this role")}>
          {alreadyShown.map((tg) => (
            <li key={tg.goalId}>
              {t("makeTargetCard.alreadyTargets", {
                defaultValue: "“{{title}}” already targets this role —",
                title: titleOf(tg.goalId),
              })}{" "}
              <Link className="font-semibold text-[#0D9488] underline" to={ROUTES.MY_GOALS.ROADMAP(tg.goalId)}>
                {t("makeTargetCard.viewRoadmapLower", "view roadmap")}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
      <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-sm text-[#475569]" htmlFor="target-goal">
          {t("makeTargetCard.goalLabel", "Goal")}
        </label>
        <select
          id="target-goal"
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          value={choice}
          disabled={make.isPending}
          onChange={(e) => setChoice(e.target.value)}
        >
          <option value={CREATE_NEW}>
            {t("makeTargetCard.createNew", "Create a new goal for this role")}
          </option>
          {goals.map((g) => (
            <option key={g.goalId} value={g.goalId}>
              {g.title}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          disabled={make.isPending}
          onClick={() =>
            make.mutate({
              jobId: data.jobId,
              fitSnapshot: data as unknown as Record<string, unknown>,
              ...(choice === CREATE_NEW ? {} : { goalId: choice }),
            })
          }
        >
          {make.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />}
          {t("makeTargetCard.title", "Make this my target")}
        </Button>
      </div>
      {mine.isError && (
        <p className="mt-2 text-xs text-[#475569]">
          {t(
            "makeTargetCard.goalsReadError",
            "Couldn't read your goals — you can still create a new one for this role.",
          )}
        </p>
      )}
      </>
      )}

      {done && (
        <p role="status" className="mt-3 text-sm text-[#0F172A]">
          {t("makeTargetCard.nowTargets", {
            defaultValue: "“{{title}}” now targets {{role}}.",
            title: done.goal.title,
            role: done.target.roleTitle || t("makeTargetCard.thisRole", "this role"),
          })}{" "}
          <Link
            className="inline-flex items-center gap-1 font-semibold text-[#0D9488] underline"
            to={ROUTES.MY_GOALS.ROADMAP(done.goal.goalId)}
          >
            <Map className="h-3.5 w-3.5" aria-hidden /> {t("makeTargetCard.viewRoadmap", "View roadmap")}
          </Link>
        </p>
      )}
      {make.isError && (
        <p role="alert" className="mt-3 text-sm text-[#B91C1C]">
          {targetErrorText(make.error)}
        </p>
      )}
    </section>
  )
}
