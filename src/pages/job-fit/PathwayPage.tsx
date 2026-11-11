import { Link, useSearchParams } from "react-router-dom"
import { Route, ArrowUpRight, ListChecks } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitPathway } from "@/hooks/job-fit/useFitPathway"
import { useGoalTargetsEnabled } from "@/hooks/switches/useGoalTargetsEnabled"
import { useMyTargets } from "@/hooks/goals/useGoalTargets"
import type { PathwaySuggestion, SkillLadder } from "@/types/job-fit"
import { PATHWAY_V2, type PathwayRole, type PathwaySection, type PathwayV2 } from "@/types/job-fit/pathway"
import { MyRoadmaps, TargetRoleAction } from "./PathwayTargets"
import { CareerProfileLink } from "./CareerProfileLink"
import { PathwayCredentials } from "./PathwayCredentials"
import { V2_SECTION_HINTS, V2_SECTION_TITLES } from "./_pathway"
import {
  FitPageHeader,
  FitCard,
  FitSectionTitle,
  FitEmptyState,
  FitLoading,
  FitMethodologyNote,
} from "@/components/fit/primitives"

function SuggestionCard({
  s,
  targets,
}: {
  s: PathwaySuggestion
  /** Present only while the goal_targets switch is on (JS-7). */
  targets?: ReturnType<typeof useMyTargets>
}) {
  const body = (
    <>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[#1f2937]">{s.roleTitle}</span>
        {/* No "{pivotDifficulty} pivot" pill (4.1, option D): the server derives
            it one-to-one from the fit tier, so it is the tier in other words. */}
      </div>
      {s.roleFamily && <p className="text-xs text-[#9ca3af]">{s.roleFamily}</p>}
      {s.rationale && <p className="mt-1.5 text-sm text-[#6b7280]">{s.rationale}</p>}
    </>
  )

  // With targets on, the card is not one big link (a button cannot sit inside
  // one): the title links to the fit page and the action sits below.
  if (s.jobId && targets) {
    return (
      <div className="rounded-lg border border-[#e5e7eb] p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">{body}</div>
          <Link
            to={ROUTES.JOB_FIT.detail(s.jobId)}
            aria-label={`Open ${s.roleTitle} fit`}
            className="shrink-0 text-[#9ca3af] hover:text-[#0D9488]"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <TargetRoleAction jobId={s.jobId} roleTitle={s.roleTitle} targets={targets} />
      </div>
    )
  }

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

/* ── JF-9 — Career Pathway v2 (drawn only when the server sends `v2`) ── */

function RoleCard({
  r,
  targets,
}: {
  r: PathwayRole
  targets?: ReturnType<typeof useMyTargets>
}) {
  const facts = [r.roleFamily, r.jobLevel != null ? `Level ${r.jobLevel}` : "Level not on file yet"]
    .filter(Boolean)
    .join(" · ")
  return (
    <div className="rounded-lg border border-[#e5e7eb] p-4" data-testid="pathway-role">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={ROUTES.JOB_FIT.detail(r.jobId)}
            className="text-sm font-semibold text-[#1f2937] hover:text-[#0D9488] hover:underline"
          >
            {r.roleTitle}
          </Link>
          <p className="text-xs text-[#9ca3af]">{facts}</p>
          {r.rationale && <p className="mt-1.5 text-sm text-[#6b7280]">{r.rationale}</p>}
        </div>
        <Link
          to={ROUTES.JOB_FIT.detail(r.jobId)}
          aria-label={`Open ${r.roleTitle}`}
          className="shrink-0 text-[#9ca3af] hover:text-[#0D9488]"
        >
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
      {targets && <TargetRoleAction jobId={r.jobId} roleTitle={r.roleTitle} targets={targets} />}
      <PathwayCredentials role={r} />
    </div>
  )
}

function V2Section({
  id,
  section,
  targets,
}: {
  id: keyof typeof V2_SECTION_TITLES
  section: PathwaySection
  targets?: ReturnType<typeof useMyTargets>
}) {
  return (
    <FitCard className="mb-6">
      <section aria-label={V2_SECTION_TITLES[id]} data-pathway-section={id}>
        <FitSectionTitle>{V2_SECTION_TITLES[id]}</FitSectionTitle>
        <p className="mb-3 text-xs text-[#9ca3af]">{V2_SECTION_HINTS[id]}</p>
        {section.items.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {section.items.map((r) => (
              <RoleCard key={r.jobId} r={r} targets={targets} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280]" data-testid="pathway-empty-reason" data-reason={section.reason ?? "unknown"}>
            {section.message ?? "Nothing to show here yet."}
          </p>
        )}
      </section>
    </FitCard>
  )
}

/** Where the pathway starts: the job the person does now, or this job. */
function OriginCard({ v2, onChoose }: { v2: PathwayV2; onChoose: (jobId: string) => void }) {
  const origin = v2.origin
  return (
    <FitCard className="mb-6">
      <FitSectionTitle>Starting from</FitSectionTitle>
      {origin ? (
        <p className="text-sm text-[#374151]" data-testid="pathway-origin">
          <Link to={ROUTES.JOB_FIT.detail(origin.jobId)} className="font-semibold text-[#0D9488] underline">
            {origin.roleTitle}
          </Link>
          <span className="text-[#6b7280]">
            {" "}
            {[origin.roleFamily, origin.jobLevel != null ? `Level ${origin.jobLevel}` : "level not on file yet"]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </p>
      ) : (
        <p className="text-sm text-[#6b7280]" data-testid="pathway-origin-reason" data-reason={v2.originReason ?? ""}>
          {v2.adjacent.message ?? "Choose the job you do now to see the jobs that lead on from it."}
        </p>
      )}
      {v2.choices.length > 0 ? (
        <label className="mt-3 block text-sm text-[#374151]">
          <span className="mb-1 block text-xs font-semibold text-[#6b7280]">
            {origin ? "Start from a different job" : "The job you do now"}
          </span>
          <select
            className="w-full max-w-md rounded-md border border-[#d1d5db] bg-white px-2 py-1.5 text-sm"
            value={origin?.jobId ?? ""}
            onChange={(e) => e.target.value && onChoose(e.target.value)}
          >
            <option value="">Choose a job…</option>
            {v2.choices.map((c) => (
              <option key={c.jobId} value={c.jobId}>
                {c.roleTitle}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="mt-3 text-sm text-[#6b7280]">No jobs are published to you yet, so there is nothing to start from.</p>
      )}
    </FitCard>
  )
}

function PathwayV2View({
  v2,
  ladders,
  targetsOn,
  targets,
  onChoose,
}: {
  v2: PathwayV2
  ladders: SkillLadder[]
  targetsOn: boolean
  targets: ReturnType<typeof useMyTargets>
  onChoose: (jobId: string) => void
}) {
  const t = targetsOn ? targets : undefined
  return (
    <>
      <OriginCard v2={v2} onChoose={onChoose} />
      <V2Section id="adjacent" section={v2.adjacent} targets={t} />
      <V2Section id="nextLevel" section={v2.nextLevel} targets={t} />
      <V2Section id="newJobs" section={v2.newJobs} targets={t} />

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

      {targetsOn && <MyRoadmaps targets={targets} />}

      <FitMethodologyNote />
    </>
  )
}

/**
 * Career pathway suggestions — adjacent role families and skill ladders. The
 * endpoint may be feature-gated or empty; when so, we render a calm empty state
 * rather than an error.
 */
export default function PathwayPage() {
  // JF-9: `?from=<job>` is where the pathway starts (the job page links here
  // with it; the main page lets the person choose). With job_fit_v2 off the
  // server ignores it and sends no `v2`, and everything below is today's page.
  const [params, setParams] = useSearchParams()
  const from = params.get("from")
  const { data, isLoading, isError } = useFitPathway(undefined, from)
  // JS-7: with the server's goal_targets switch on, the skill ladders (three
  // template sentences per skill) give way to the person's roadmaps from the
  // roadmap engine, and each suggested role can be made a target. Off, loading
  // and error all read as off, so this is today's page until the server says so.
  const targetsOn = useGoalTargetsEnabled()
  const targets = useMyTargets(targetsOn)

  const suggestions = data?.suggestions ?? []
  const ladders = targetsOn ? [] : (data?.skillLadders ?? [])
  const hasContent = suggestions.length > 0 || ladders.length > 0
  const v2 = data?.v2?.version === PATHWAY_V2 ? data.v2 : null
  const choose = (jobId: string) => {
    const next = new URLSearchParams(params)
    next.set("from", jobId)
    setParams(next, { replace: true })
  }

  if (!isLoading && !isError && v2) {
    return (
      <div className="mx-auto max-w-4xl">
        <FitPageHeader
          icon={Route}
          title="Career Pathways"
          description="Jobs you could move into next, the roles you're developing toward, and how to get there."
        />
        <CareerProfileLink />
        <FitCard className="mb-6">
          <FitSectionTitle>What this is</FitSectionTitle>
          <p className="text-sm leading-relaxed text-[#374151]">
            Career Pathways starts from a job — the one you do now, or the job you opened it from — and shows
            where it can lead. Each job shows the training or credentials it asks for and where to get them;
            open a job to see how your profile fits it.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-[#6b7280]">
            <li className="flex items-start gap-2">
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" />
              <span><span className="font-medium text-[#374151]">{V2_SECTION_TITLES.adjacent}</span> — jobs with a similar blueprint at the same or a lower level, so no new credential.</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" />
              <span><span className="font-medium text-[#374151]">{V2_SECTION_TITLES.nextLevel}</span> — the next level up in the same job family.</span>
            </li>
            <li className="flex items-start gap-2">
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" />
              <span><span className="font-medium text-[#374151]">{V2_SECTION_TITLES.newJobs}</span> — other jobs your PRISM profile is growing toward.</span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-[#9ca3af]">
            Job levels and occupation codes come from O*NET as they are loaded for each job. Where one isn&apos;t
            on file yet, the section says so rather than guessing.
          </p>
        </FitCard>
        <PathwayV2View v2={v2} ladders={ladders} targetsOn={targetsOn} targets={targets} onChoose={choose} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <FitPageHeader
        icon={Route}
        title="Career Pathways"
        description="Adjacent roles you could grow toward, and the skills that get you there."
      />

      {/* N-8: renders nothing unless the server's career_pathways_profile switch is on. */}
      <CareerProfileLink />

      {/* Always-visible explainer so the page is self-describing even when empty */}
      <FitCard className="mb-6">
        <FitSectionTitle>What this is</FitSectionTitle>
        <p className="text-sm leading-relaxed text-[#374151]">
          Career Pathways looks beyond the roles you already match closely and highlights the ones
          you&apos;re <span className="font-medium text-[#0f766e]">developing toward</span> — roles a
          step or two out where your profile is a workable-but-growing fit. For each, it shows the
          specific behaviors to build; the <span className="font-medium">skill
          ladders</span> break those into small, concrete steps.
        </p>
        <ul className="mt-3 space-y-1.5 text-sm text-[#6b7280]">
          <li className="flex items-start gap-2">
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" />
            <span><span className="font-medium text-[#374151]">Adjacent roles</span> — growth targets ranked by how reachable they are from where you are now.</span>
          </li>
          <li className="flex items-start gap-2">
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" />
            {targetsOn ? (
              <span><span className="font-medium text-[#374151]">Roadmaps</span> — make a role your target and the growth areas between your profile and its blueprint become the steps, in the order to work on them.</span>
            ) : (
              <span><span className="font-medium text-[#374151]">Skill ladders</span> — a few practical steps to develop the growth areas for those roles.</span>
            )}
          </li>
        </ul>
        <p className="mt-3 text-xs text-[#9ca3af]">
          Pathways are personalized to your PRISM profile and the roles published to you. As more
          roles are published — or as you complete your assessment — more pathways appear here.
        </p>
      </FitCard>

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

      {/* A roadmap can exist without a suggestion (targeted from the fit page). */}
      {!isLoading && !isError && !hasContent && targetsOn && <MyRoadmaps targets={targets} />}

      {!isLoading && !isError && hasContent && (
        <>
          {suggestions.length > 0 && (
            <FitCard className="mb-6">
              <FitSectionTitle>Adjacent roles</FitSectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {suggestions.map((s, i) => (
                  <SuggestionCard
                    key={s.jobId ?? `${s.roleTitle}-${i}`}
                    s={s}
                    targets={targetsOn ? targets : undefined}
                  />
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

          {targetsOn && <MyRoadmaps targets={targets} />}

          {data?.note && <p className="mb-4 text-sm text-[#6b7280]">{data.note}</p>}

          <FitMethodologyNote />
        </>
      )}
    </div>
  )
}
