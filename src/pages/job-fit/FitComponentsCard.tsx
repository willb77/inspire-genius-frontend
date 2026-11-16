import { Layers } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { FitComponentsResponse, JobComponents } from "@/types/job-fit/components"
import { FitCard, FitPill, FitSectionTitle, FitMeter } from "@/components/fit/primitives"
import {
  COMPONENT_LABEL,
  VERDICT_LABEL,
  VERDICT_TONE,
  asOverall,
  asV1,
  experienceAbsentReason,
  goalAbsentReason,
} from "@/components/fit/components"
import { OverallFitCard } from "./OverallFitCard"

type Props = {
  fitPct: number
  job: JobComponents | undefined
  weights: FitComponentsResponse["weights"] | undefined
  isError: boolean
  /** FIT-3: present only while the server's overall_fit switch is on. */
  person?: FitComponentsResponse["person"]
  benchmarksValidated?: FitComponentsResponse["benchmarksValidated"]
}

/**
 * "How this is made" — the behavioural fit beside what else is known about the
 * role for this person: how it sits with their goals, and how much of its work
 * their résumé already shows. The fit % above is never changed; the composite is
 * shown beside it, and a missing part is named rather than counted as zero.
 */
export function FitComponentsCard({
  fitPct,
  job,
  weights,
  isError,
  person,
  benchmarksValidated,
}: Props) {
  const { t } = useTranslation("jobFitPages")
  if (isError) {
    return (
      <FitCard className="mb-6">
        <p role="alert" className="text-sm text-[#6b7280]">
          {t(
            "fitComponentsCard.loadError",
            "We couldn't load how this role sits with your goals and experience. Your fit above is unaffected.",
          )}
        </p>
      </FitCard>
    )
  }
  // FIT-3: with Overall fit on, this slot is the Overall fit card instead.
  const overallJob = asOverall(job)
  if (overallJob) {
    return (
      <OverallFitCard
        job={overallJob}
        weights={weights}
        person={person}
        benchmarksValidated={benchmarksValidated}
      />
    )
  }
  const v1 = asV1(job)
  if (!v1) return null
  const { goalAlignment: goal, experienceMatch: exp, composite } = v1
  const goalReason = goalAbsentReason(goal)
  const expReason = experienceAbsentReason(exp)
  const listAnd = t("shared.listAnd", " and ")
  const weightsText = weights
    ? `${weights.behavioural}/${weights.goalAlignment}/${weights.experienceMatch}`
    : ""

  return (
    <FitCard className="mb-6">
      <FitSectionTitle>{t("fitComponentsCard.title", "How this is made")}</FitSectionTitle>

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
              {goal.goalTitles.length === 1
                ? t("fitComponentsCard.linkedGoalOne", {
                    defaultValue: "Linked goal: {{titles}}.",
                    titles: goal.goalTitles.join("; "),
                  })
                : t("fitComponentsCard.linkedGoalOther", {
                    defaultValue: "Linked goals: {{titles}}.",
                    titles: goal.goalTitles.join("; "),
                  })}
              {goal.pullingDimensions.length > 0 &&
                ` ${
                  goal.verdict === "at-tension"
                    ? t("fitComponentsCard.pullingAgainst", {
                        defaultValue: "Pulling against it: {{dimensions}}.",
                        dimensions: goal.pullingDimensions.join(listAnd),
                      })
                    : t("fitComponentsCard.carrying", {
                        defaultValue: "Carrying it: {{dimensions}}.",
                        dimensions: goal.pullingDimensions.join(listAnd),
                      })
                }`}
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
                {t("fitComponentsCard.activitiesCovered", {
                  defaultValue: "{{covered}} of {{total}} activities",
                  covered: exp.covered,
                  total: exp.total,
                })}
              </span>
            )}
          </div>
          {exp.status === "scored" ? (
            exp.uncovered.length > 0 && (
              <p className="text-sm text-[#4b5563]">
                {t("fitComponentsCard.notOnResume", {
                  defaultValue: "Not yet on your résumé: {{items}}.",
                  items: exp.uncovered.join("; "),
                })}
              </p>
            )
          ) : (
            <p className="text-sm text-[#6b7280]">{expReason}</p>
          )}
        </div>

        <div className="rounded-lg bg-[#f9fafb] p-3 text-sm">
          <div className="flex items-center gap-2 font-medium text-[#1f2937]">
            <Layers className="h-4 w-4 text-[#0D9488]" />
            {composite.score != null ? (
              <span>
                {t("fitComponentsCard.composite", {
                  defaultValue: "Composite: {{score}}%",
                  score: Math.round(composite.score),
                })}
              </span>
            ) : (
              <span>{t("fitComponentsCard.noComposite", "No composite yet")}</span>
            )}
          </div>
          <p className="mt-1 text-[#6b7280]">
            {composite.score != null
              ? composite.missing.length > 0
                ? t("fitComponentsCard.weightedRescaled", {
                    defaultValue:
                      "Weighted {{weights}} across behavioural fit, goals and experience, rescaled without {{missing}}.",
                    weights: weightsText,
                    missing: composite.missing
                      .map((k) => COMPONENT_LABEL[k].toLowerCase())
                      .join(listAnd),
                  })
                : t("fitComponentsCard.weighted", {
                    defaultValue: "Weighted {{weights}} across behavioural fit, goals and experience.",
                    weights: weightsText,
                  })
              : t(
                  "fitComponentsCard.needsMore",
                  "It needs at least one more part beyond your behavioural fit; the fit % above is your read for now.",
                )}{" "}
            {t(
              "fitComponentsCard.disclaimer",
              "Decision support for your own development — never a selection verdict.",
            )}
          </p>
        </div>
      </div>
    </FitCard>
  )
}
