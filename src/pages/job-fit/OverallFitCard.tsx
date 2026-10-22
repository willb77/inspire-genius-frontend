import { Layers } from "lucide-react"
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
function signalDetail(key: OverallSignalKey, s: OverallSignal): string | null {
  switch (key) {
    case "function": {
      const yours =
        s.score === 100
          ? `your main field is ${s.personFamily}`
          : s.score === 60
            ? `${s.roleFamily} is one of your other fields`
            : `your main field is ${s.personFamily}`
      const quote = s.evidence ? ` — from "${s.evidence}"` : ""
      return `This role is ${s.roleFamily}; ${yours}${quote}.`
    }
    case "seniority": {
      const role = s.roleLevel ? LEVEL_NAME[s.roleLevel] : null
      const yours = s.personLevel ? LEVEL_NAME[s.personLevel] : null
      const quote = s.evidence ? ` ("${s.evidence}")` : ""
      return `This role is ${role} level; the highest you've held is ${yours}${quote}.`
    }
    case "skills":
      return `${s.covered} of ${s.total} of this role's activities show on your résumé` +
        (s.uncovered && s.uncovered.length > 0 ? `. Not yet: ${s.uncovered.join("; ")}.` : ".")
    case "goal":
      return s.score === 100
        ? "One of your goals points toward this kind of role."
        : `Your goals point toward ${(s.goalFamilies ?? []).join(" and ")}, not this kind of role.`
    case "prism":
      return "How your behavioural profile sits with this role's benchmark — unchanged."
  }
}

/**
 * FIT-3 — the Overall fit card on a role's detail page: one line per signal,
 * with its weight and either its value and what it rests on, or why it is
 * absent. The PRISM fit above it is never changed. Shown only while the
 * server's overall_fit switch is on.
 */
export function OverallFitCard({ job, weights, person, benchmarksValidated }: Props) {
  const { overall } = job
  const others = person?.otherAssessments ?? []
  return (
    <FitCard className="mb-6">
      <FitSectionTitle>Overall fit</FitSectionTitle>

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#f9fafb] p-3 text-sm font-medium text-[#1f2937]">
        <Layers className="h-4 w-4 text-[#0D9488]" />
        {overall.score != null ? (
          <span>Overall fit: {Math.round(overall.score)}%</span>
        ) : overall.status === "not_set_up" ? (
          <span>Overall fit isn&apos;t set up on this service yet — your PRISM fit above is your read.</span>
        ) : (
          <span>Not enough about you to combine yet — add a résumé. Your PRISM fit above is your read.</span>
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
                  {present ? `${Math.round(s.score as number)}%` : "not counted"}
                  {weights?.[key] != null && ` · weight ${weights[key]}`}
                </span>
              </div>
              <p className={present ? "text-[#4b5563]" : "text-[#6b7280]"}>
                {present && s ? signalDetail(key, s) : overallAbsentReason(key, s)}
              </p>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 space-y-1 text-xs text-[#6b7280]">
        {overall.score != null && overall.missing.length > 0 && (
          <p>
            Rescaled without{" "}
            {overall.missing.map((k) => OVERALL_LABEL[k].toLowerCase()).join(", ")} — a part we
            don&apos;t know is left out, never counted as zero.
          </p>
        )}
        {benchmarksValidated === false && (
          <p>Role benchmarks are not yet validated against people working in these roles.</p>
        )}
        {others.length > 0 && (
          <p>
            Other assessments not used: {others.map((o) => o.framework).join(", ")} — no role
            mapping yet.
          </p>
        )}
        <p>Decision support for your own development — never a selection verdict.</p>
      </div>
    </FitCard>
  )
}
