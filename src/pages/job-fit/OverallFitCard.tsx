import { Layers } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import type { JobOverall, OverallPerson, OverallSignal, OverallSignalKey } from "@/types/job-fit/components"
import { FitCard, FitSectionTitle } from "@/components/fit/primitives"
import { LEVEL_NAME, OVERALL_LABEL, OVERALL_SIGNALS, overallAbsentReason } from "@/components/fit/components"

type Props = {
  job: JobOverall
  weights: Record<string, number> | undefined
  person: OverallPerson | undefined
  benchmarksValidated: boolean | undefined
}

/** What one present signal rests on, in the person's own words where it can. */
function signalDetail(key: OverallSignalKey, s: OverallSignal, t: TFunction): string | null {
  switch (key) {
    case "function": {
      const other = s.score === 60
      const vars = {
        roleFamily: s.roleFamily,
        personFamily: s.personFamily,
        evidence: s.evidence,
      }
      if (other) {
        return s.evidence
          ? t("overallFitCard.functionOtherQuote", {
              defaultValue:
                "This role is {{roleFamily}}; {{roleFamily}} is one of your other fields — from \"{{evidence}}\".",
              ...vars,
            })
          : t("overallFitCard.functionOther", {
              defaultValue: "This role is {{roleFamily}}; {{roleFamily}} is one of your other fields.",
              ...vars,
            })
      }
      return s.evidence
        ? t("overallFitCard.functionMainQuote", {
            defaultValue:
              "This role is {{roleFamily}}; your main field is {{personFamily}} — from \"{{evidence}}\".",
            ...vars,
          })
        : t("overallFitCard.functionMain", {
            defaultValue: "This role is {{roleFamily}}; your main field is {{personFamily}}.",
            ...vars,
          })
    }
    case "seniority": {
      const role = s.roleLevel ? LEVEL_NAME[s.roleLevel] : null
      const yours = s.personLevel ? LEVEL_NAME[s.personLevel] : null
      return s.evidence
        ? t("overallFitCard.seniorityQuote", {
            defaultValue:
              "This role is {{role}} level; the highest you've held is {{yours}} (\"{{evidence}}\").",
            role,
            yours,
            evidence: s.evidence,
          })
        : t("overallFitCard.seniority", {
            defaultValue: "This role is {{role}} level; the highest you've held is {{yours}}.",
            role,
            yours,
          })
    }
    case "skills":
      return s.uncovered && s.uncovered.length > 0
        ? t("overallFitCard.skillsUncovered", {
            defaultValue:
              "{{covered}} of {{total}} of this role's activities show on your résumé. Not yet: {{items}}.",
            covered: s.covered,
            total: s.total,
            items: s.uncovered.join("; "),
          })
        : t("overallFitCard.skills", {
            defaultValue: "{{covered}} of {{total}} of this role's activities show on your résumé.",
            covered: s.covered,
            total: s.total,
          })
    case "goal":
      return s.score === 100
        ? t("overallFitCard.goalAligned", "One of your goals points toward this kind of role.")
        : t("overallFitCard.goalElsewhere", {
            defaultValue: "Your goals point toward {{families}}, not this kind of role.",
            families: (s.goalFamilies ?? []).join(t("shared.listAnd", " and ")),
          })
    case "prism":
      return t(
        "overallFitCard.prism",
        "How your behavioural profile sits with this role's blueprint — unchanged.",
      )
  }
}

/**
 * FIT-3 — the Overall fit card on a role's detail page: one line per signal,
 * with its weight and either its value and what it rests on, or why it is
 * absent. The PRISM fit above it is never changed. Shown only while the
 * server's overall_fit switch is on.
 */
export function OverallFitCard({ job, weights, person, benchmarksValidated }: Props) {
  const { t } = useTranslation("jobFitPages")
  const { overall } = job
  const others = person?.otherAssessments ?? []
  return (
    <FitCard className="mb-6">
      <FitSectionTitle>{t("overallFitCard.title", "Overall fit")}</FitSectionTitle>

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#f9fafb] p-3 text-sm font-medium text-[#1f2937]">
        <Layers className="h-4 w-4 text-[#0D9488]" />
        {overall.score != null ? (
          <span>
            {t("overallFitCard.scoreLine", {
              defaultValue: "Overall fit: {{score}}%",
              score: Math.round(overall.score),
            })}
          </span>
        ) : overall.status === "not_set_up" ? (
          <span>
            {t(
              "overallFitCard.notSetUp",
              "Overall fit isn't set up on this service yet — your PRISM fit above is your read.",
            )}
          </span>
        ) : (
          <span>
            {t(
              "overallFitCard.notEnough",
              "Not enough about you to combine yet — add a résumé. Your PRISM fit above is your read.",
            )}
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {OVERALL_SIGNALS.filter((k) => overall.signals[k] !== undefined).map((key) => {
          const s = overall.signals[key]
          const present = s?.status === "scored" && typeof s.score === "number"
          return (
            <li key={key} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[#1f2937]">{OVERALL_LABEL[key]}</span>
                <span className="text-[#6b7280]">
                  {present ? `${Math.round(s.score as number)}%` : t("overallFitCard.notCounted", "not counted")}
                  {weights?.[key] != null &&
                    ` ${t("overallFitCard.weight", {
                      defaultValue: "· weight {{weight}}",
                      weight: weights[key],
                    })}`}
                </span>
              </div>
              <p className={present ? "text-[#4b5563]" : "text-[#6b7280]"}>
                {present && s ? signalDetail(key, s, t) : overallAbsentReason(key, s)}
              </p>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 space-y-1 text-xs text-[#6b7280]">
        {overall.score != null && overall.missing.length > 0 && (
          <p>
            {t("overallFitCard.rescaled", {
              defaultValue:
                "Rescaled without {{missing}} — a part we don't know is left out, never counted as zero.",
              missing: overall.missing.map((k) => OVERALL_LABEL[k].toLowerCase()).join(", "),
            })}
          </p>
        )}
        {benchmarksValidated === false && (
          <p>
            {t(
              "overallFitCard.notValidated",
              "Role blueprints are not yet validated against people working in these roles.",
            )}
          </p>
        )}
        {others.length > 0 && (
          <p>
            {t("overallFitCard.otherAssessments", {
              defaultValue: "Other assessments not used: {{items}} — no role mapping yet.",
              items: others.map((o) => o.framework).join(", "),
            })}
          </p>
        )}
        <p>
          {t(
            "overallFitCard.disclaimer",
            "Decision support for your own development — never a selection verdict.",
          )}
        </p>
      </div>
    </FitCard>
  )
}
