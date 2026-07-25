import { Link } from "react-router-dom"
import { Route, ArrowUpRight, ListChecks } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitPathway } from "@/hooks/job-fit/useFitPathway"
import type { PathwaySuggestion } from "@/types/job-fit"
import {
  FitPageHeader,
  FitCard,
  FitPill,
  FitSectionTitle,
  FitEmptyState,
  FitLoading,
  FitMethodologyNote,
} from "./_shared"
import type { Tone } from "./_fit"

function difficultyTone(difficulty?: string): Tone {
  switch ((difficulty ?? "").toLowerCase()) {
    case "low":
      return "green"
    case "moderate":
    case "medium":
      return "teal"
    case "high":
      return "amber"
    default:
      return "gray"
  }
}

function SuggestionCard({ s }: { s: PathwaySuggestion }) {
  const body = (
    <>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[#1f2937]">{s.roleTitle}</span>
        {s.pivotDifficulty && (
          <FitPill tone={difficultyTone(s.pivotDifficulty)}>{s.pivotDifficulty} pivot</FitPill>
        )}
      </div>
      {s.roleFamily && <p className="text-xs text-[#9ca3af]">{s.roleFamily}</p>}
      {s.rationale && <p className="mt-1.5 text-sm text-[#6b7280]">{s.rationale}</p>}
    </>
  )

  if (s.jobId) {
    return (
      <Link
        to={ROUTES.JOB_FIT.detail(s.jobId)}
        className="group block rounded-lg border border-[#e5e7eb] p-4 transition-colors hover:border-[#0D9488]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">{body}</div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-[#9ca3af] group-hover:text-[#0D9488]" />
        </div>
      </Link>
    )
  }

  return <div className="rounded-lg border border-[#e5e7eb] p-4">{body}</div>
}

/**
 * Career pathway suggestions — adjacent role families and skill ladders. The
 * endpoint may be feature-gated or empty; when so, we render a calm empty state
 * rather than an error.
 */
export default function PathwayPage() {
  const { data, isLoading, isError } = useFitPathway()

  const suggestions = data?.suggestions ?? []
  const ladders = data?.skillLadders ?? []
  const hasContent = suggestions.length > 0 || ladders.length > 0

  return (
    <div className="mx-auto max-w-4xl">
      <FitPageHeader
        icon={Route}
        title="Career Pathways"
        description="Adjacent roles you could grow toward, and the skills that get you there."
      />

      {isLoading && <FitLoading label="Looking for adjacent pathways…" />}

      {isError && (
        <FitEmptyState>
          Pathway suggestions aren&apos;t available yet. Explore your{" "}
          <Link to={ROUTES.JOB_FIT.MATCHES} className="text-[#0D9488] underline">
            role matches
          </Link>{" "}
          in the meantime.
        </FitEmptyState>
      )}

      {!isLoading && !isError && !hasContent && (
        <FitEmptyState>
          {data?.note ??
            "No pathway suggestions are available for your profile yet. As more roles are published, adjacent pathways will appear here."}
        </FitEmptyState>
      )}

      {!isLoading && !isError && hasContent && (
        <>
          {suggestions.length > 0 && (
            <FitCard className="mb-6">
              <FitSectionTitle>Adjacent roles</FitSectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {suggestions.map((s, i) => (
                  <SuggestionCard key={s.jobId ?? `${s.roleTitle}-${i}`} s={s} />
                ))}
              </div>
            </FitCard>
          )}

          {ladders.length > 0 && (
            <FitCard className="mb-6">
              <FitSectionTitle>Skill ladders</FitSectionTitle>
              <div className="space-y-4">
                {ladders.map((l) => (
                  <div key={l.skill}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-[#0D9488]" />
                      <span className="text-sm font-medium text-[#1f2937]">{l.skill}</span>
                    </div>
                    <ol className="ml-6 list-decimal space-y-1 text-sm text-[#6b7280]">
                      {l.steps.map((step, si) => (
                        <li key={si}>{step}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </FitCard>
          )}

          {data?.note && <p className="mb-4 text-sm text-[#6b7280]">{data.note}</p>}

          <FitMethodologyNote />
        </>
      )}
    </div>
  )
}
