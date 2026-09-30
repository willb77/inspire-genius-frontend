import { Layers } from "lucide-react"
import type { FitComponentsResponse, JobComponents } from "@/types/job-fit/components"
import { FitCard, FitPill, FitSectionTitle, FitMeter } from "./_shared"
import {
  COMPONENT_LABEL,
  VERDICT_LABEL,
  VERDICT_TONE,
  experienceAbsentReason,
  goalAbsentReason,
} from "./_components"

type Props = {
  fitPct: number
  job: JobComponents | undefined
  weights: FitComponentsResponse["weights"] | undefined
  isError: boolean
}

/**
 * "How this is made" — the behavioural fit beside what else is known about the
 * role for this person: how it sits with their goals, and how much of its work
 * their résumé already shows. The fit % above is never changed; the composite is
 * shown beside it, and a missing part is named rather than counted as zero.
 */
export function FitComponentsCard({ fitPct, job, weights, isError }: Props) {
  if (isError) {
    return (
      <FitCard className="mb-6">
        <p role="alert" className="text-sm text-[#6b7280]">
          We couldn&apos;t load how this role sits with your goals and experience. Your fit above is
          unaffected.
        </p>
      </FitCard>
    )
  }
  if (!job || job.status !== "ok") return null
  const { goalAlignment: goal, experienceMatch: exp, composite } = job
  const goalReason = goalAbsentReason(goal)
  const expReason = experienceAbsentReason(exp)

  return (
    <FitCard className="mb-6">
      <FitSectionTitle>How this is made</FitSectionTitle>

      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-[#1f2937]">{COMPONENT_LABEL.behavioural}</span>
            <span className="text-[#6b7280]">{fitPct}%</span>
          </div>
          <FitMeter value={fitPct} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="font-medium text-[#1f2937]">{COMPONENT_LABEL.goalAlignment}</span>
            {goal.status === "scored" && (
              <FitPill tone={VERDICT_TONE[goal.verdict]}>{VERDICT_LABEL[goal.verdict]}</FitPill>
            )}
          </div>
          {goal.status === "scored" ? (
            <p className="text-sm text-[#4b5563]">
              Linked goal{goal.goalTitles.length === 1 ? "" : "s"}: {goal.goalTitles.join("; ")}.
              {goal.pullingDimensions.length > 0 &&
                ` ${goal.verdict === "at-tension" ? "Pulling against it" : "Carrying it"}: ${goal.pullingDimensions.join(" and ")}.`}
            </p>
          ) : (
            <p className="text-sm text-[#6b7280]">{goalReason}</p>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-[#1f2937]">{COMPONENT_LABEL.experienceMatch}</span>
            {exp.status === "scored" && (
              <span className="text-[#6b7280]">
                {exp.covered} of {exp.total} activities
              </span>
            )}
          </div>
          {exp.status === "scored" ? (
            exp.uncovered.length > 0 && (
              <p className="text-sm text-[#4b5563]">Not yet on your résumé: {exp.uncovered.join("; ")}.</p>
            )
          ) : (
            <p className="text-sm text-[#6b7280]">{expReason}</p>
          )}
        </div>

        <div className="rounded-lg bg-[#f9fafb] p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-[#1f2937]">
            <Layers className="h-4 w-4 text-[#0D9488]" />
            {composite.score != null ? (
              <span>Composite: {Math.round(composite.score)}%</span>
            ) : (
              <span>No composite yet</span>
            )}
          </div>
          <p className="mt-1 text-[#6b7280]">
            {composite.score != null
              ? `Weighted ${weights ? `${weights.behavioural}/${weights.goalAlignment}/${weights.experienceMatch}` : ""} across behavioural fit, goals and experience` +
                (composite.missing.length > 0
                  ? `, rescaled without ${composite.missing.map((k) => COMPONENT_LABEL[k].toLowerCase()).join(" and ")}.`
                  : ".")
              : "It needs at least one more part beyond your behavioural fit; the fit % above is your read for now."}{" "}
            Decision support for your own development — never a selection verdict.
          </p>
        </div>
      </div>
    </FitCard>
  )
}
