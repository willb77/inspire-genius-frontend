import { useState } from "react"
import { Link } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { Flag, Loader2, Map } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import { useMakeTarget, useMyTargets } from "@/hooks/goals/useGoalTargets"
import { fitService } from "@/services/job-fit/fit.service"
import { targetErrorText } from "@/pages/summit/_targets"
import type { FitDetail } from "@/types/job-fit"
import type { GoalTargetWithRoadmap, RoadmapMilestone } from "@/types/goals/targets"
import { FitCard, FitSectionTitle } from "./_shared"

/**
 * JS-7 (D-JS2): the Pathway page reads the roadmap engine. Everything here is
 * rendered only while the server's `goal_targets` switch is on — the page
 * decides — so with it off the page is today's page.
 *
 * "Make this my target" on a suggested role aims the role's own goal at it
 * (creating that goal when there is none, reusing it otherwise — the server
 * keys it on the role) and stores the fit it was built from. The pathway
 * payload carries no gaps, so the fit detail is read first — the same read,
 * and the same snapshot row, as opening the role's fit page.
 */

/** The same key `useFitDetail` uses, so a later visit to the fit page is warm. */
function fitDetailKey(jobId: string) {
  return ["job-fit", "detail", jobId, "gap"] as const
}

async function fetchFitDetail(
  qc: ReturnType<typeof useQueryClient>,
  jobId: string,
): Promise<FitDetail> {
  return qc.fetchQuery({
    queryKey: fitDetailKey(jobId),
    queryFn: async () => {
      const res = await fitService.getDetail(jobId, "gap")
      return res.data.data as FitDetail
    },
  })
}

export function TargetRoleAction({
  jobId,
  roleTitle,
  targets,
}: {
  jobId: string
  roleTitle: string
  targets: ReturnType<typeof useMyTargets>
}) {
  const qc = useQueryClient()
  const make = useMakeTarget()
  const [reading, setReading] = useState(false)
  const [readError, setReadError] = useState<unknown>(null)

  const already = (targets.data ?? []).filter((t) => t.jobId === jobId)
  const done = make.data
  const busy = reading || make.isPending
  const error = readError ?? make.error

  // A role one of my goals already targets offers its roadmap, not a second
  // create (which would only re-aim the same goal). Held back while the list
  // loads so it cannot be clicked first; if that read fails the button stays,
  // since a create then reuses the goal.
  if (already.length > 0) {
    return (
      <p className="mt-2 text-xs text-[#0f766e]" data-testid="already-targeted">
        A goal already targets this role —{" "}
        <Link className="font-semibold underline" to={ROUTES.MY_GOALS.ROADMAP(already[0].goalId)}>
          view roadmap
        </Link>
      </p>
    )
  }

  if (done) {
    return (
      <p role="status" className="mt-2 text-xs text-[#0f766e]">
        &ldquo;{done.goal.title}&rdquo; now targets {done.target.roleTitle || roleTitle}.{" "}
        <Link
          className="inline-flex items-center gap-1 font-semibold underline"
          to={ROUTES.MY_GOALS.ROADMAP(done.goal.goalId)}
        >
          <Map className="h-3 w-3" aria-hidden /> View roadmap
        </Link>
      </p>
    )
  }

  const onClick = async () => {
    setReadError(null)
    setReading(true)
    let detail: FitDetail
    try {
      detail = await fetchFitDetail(qc, jobId)
    } catch (e) {
      setReadError(e)
      setReading(false)
      return
    }
    setReading(false)
    make.mutate({ jobId, fitSnapshot: detail as unknown as Record<string, unknown> })
  }

  return (
    <div className="mt-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy || targets.isLoading}
        onClick={onClick}
        aria-label={`Make ${roleTitle} my target`}
      >
        {busy ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Flag className="mr-1 h-3.5 w-3.5" aria-hidden />
        )}
        Make this my target
      </Button>
      {error != null && (
        <p role="alert" className="mt-1 text-xs text-[#B91C1C]">
          {targetErrorText(error)}
        </p>
      )}
    </div>
  )
}

function Milestone({ m }: { m: RoadmapMilestone }) {
  return (
    <li className="text-sm text-[#6b7280]">
      <span className="font-medium text-[#1f2937]">{m.title || m.competency}</span>
      {m.severity === "critical" && (
        <span className="ml-2 rounded bg-[#C2614F]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[#C2614F]">
          Priority
        </span>
      )}
      {m.why && <span className="block">{m.why}</span>}
      {m.canon && (
        <span className="mt-1 block border-l-[3px] border-[#0D9488] pl-2 text-xs text-[#6b7280]">
          <b>{m.canon.dimension} in PRISM:</b> {m.canon.definition}
        </span>
      )}
    </li>
  )
}

function TargetRoadmap({ t }: { t: GoalTargetWithRoadmap }) {
  const r = t.roadmap?.roadmap
  const title = r?.goalTitle ?? `Toward ${t.roleTitle}`
  return (
    <div data-testid="pathway-roadmap">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <Flag className="h-4 w-4 text-[#0D9488]" aria-hidden />
        <span className="text-sm font-medium text-[#1f2937]">{title}</span>
        <span className="text-xs text-[#9ca3af]">targets {t.roleTitle}</span>
        <Link
          to={ROUTES.MY_GOALS.ROADMAP(t.goalId)}
          className="ml-auto text-xs font-semibold text-[#0D9488] underline"
        >
          Full roadmap
        </Link>
      </div>
      {!r && (
        <p className="ml-6 text-sm text-[#6b7280]">No roadmap has been built for this target yet.</p>
      )}
      {r && r.gapsPending && (
        <p className="ml-6 text-sm text-[#6b7280]">
          The fit you chose this role from showed no gaps to close.
        </p>
      )}
      {r && !r.gapsPending && (
        <ol className="ml-6 list-decimal space-y-1.5">
          {r.milestones.map((m) => (
            <Milestone key={m.itemId} m={m} />
          ))}
        </ol>
      )}
      {r && (
        <p className="ml-6 mt-1 text-xs text-[#9ca3af]">
          {r.start.pending ? "No first step on this goal yet. " : ""}
          {r.finish.pending ? "No success measure on this goal yet." : ""}
        </p>
      )}
    </div>
  )
}

/**
 * The person's roadmaps, one per targeted role, read from the roadmap engine.
 * Replaces the skill ladders while the switch is on. States that are not an
 * error — nothing targeted yet, the read failed — are said, never filled in.
 */
export function MyRoadmaps({ targets }: { targets: ReturnType<typeof useMyTargets> }) {
  const rows = targets.data ?? []
  return (
    <FitCard className="mb-6">
      <FitSectionTitle>Your roadmaps</FitSectionTitle>
      {targets.isLoading && (
        <p className="flex items-center gap-2 text-sm text-[#6b7280]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your roadmaps…
        </p>
      )}
      {targets.isError && (
        <p role="alert" className="text-sm text-[#B91C1C]">
          We couldn&apos;t load your roadmaps. Please try again shortly.
        </p>
      )}
      {!targets.isLoading && !targets.isError && rows.length === 0 && (
        <p className="text-sm text-[#6b7280]">
          You haven&apos;t targeted a role yet. Choose &ldquo;Make this my target&rdquo; on a role
          above and its roadmap — the gaps between your profile and that role&apos;s benchmark,
          in the order to close them — appears here.
        </p>
      )}
      {rows.length > 0 && (
        <div className="space-y-5">
          {rows.map((t) => (
            <TargetRoadmap key={t.targetId} t={t} />
          ))}
        </div>
      )}
    </FitCard>
  )
}
