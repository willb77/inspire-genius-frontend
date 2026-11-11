import { Link } from "react-router-dom"
import { Flag, Heart, Loader2, Map } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import { useMyTargets } from "@/hooks/goals/useGoalTargets"
import { useGoalTargetsEnabled } from "@/hooks/switches/useGoalTargetsEnabled"
import {
  useRemoveSavedJob,
  useSavedJobs,
  useSavedJobsEnabled,
} from "@/hooks/job-fit/useSavedJobs"
import { savedJobErrorText } from "@/pages/job-fit/_savedJobs"

/**
 * JF-7 — the Favorites list. Favorites are options; the target is the one
 * priority. A favorite that a goal already targets is marked "Your target";
 * any other offers "Make this my target", which opens the job, where the
 * existing MakeTargetCard writes `goal_targets` exactly as it does today.
 *
 * Renders nothing until the server says Favorites is on (`job_fit_v2`). A list
 * that failed to load says so; it is never shown as an empty list.
 */
export function FavoritesList() {
  const enabled = useSavedJobsEnabled()
  const list = useSavedJobs(enabled)
  const remove = useRemoveSavedJob()
  const targetsOn = useGoalTargetsEnabled()
  const targets = useMyTargets(enabled && targetsOn)

  if (!enabled) return null

  const jobs = list.data ?? []
  const targetOf = (jobId: string) => (targets.data ?? []).find((t) => t.jobId === jobId)

  return (
    <section aria-labelledby="favorites-heading" className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="favorites-heading" className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
        <Heart className="h-4 w-4 text-[#0D9488]" aria-hidden />
        Favorites
      </h2>
      <p className="mt-1 text-sm text-[#475569]">
        Jobs you are keeping as options. Make one of them your target to get a roadmap toward it.
      </p>

      {list.isLoading && (
        <p className="mt-3 flex items-center gap-2 text-sm text-[#475569]" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading your favorites…
        </p>
      )}

      {list.isError && (
        <p role="alert" className="mt-3 text-sm text-[#B91C1C]">
          Couldn&apos;t load your favorites. {savedJobErrorText(list.error)}
        </p>
      )}

      {list.isSuccess && jobs.length === 0 && (
        <p className="mt-3 text-sm text-[#475569]">
          No favorites yet. Use &ldquo;Save to Favorites&rdquo; on a job to keep it here.
        </p>
      )}

      {jobs.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100" aria-label="Your favorite jobs">
          {jobs.map((job) => {
            const target = targetOf(job.jobId)
            const title = job.roleTitle || "Saved job"
            return (
              <li key={job.jobId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <Link
                    className="font-medium text-[#0F172A] underline-offset-2 hover:underline"
                    to={ROUTES.JOB_FIT.detail(job.jobId)}
                  >
                    {title}
                  </Link>
                  {target && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#F0FDFA] px-2 py-0.5 text-xs font-semibold text-[#0D9488]">
                      <Flag className="h-3 w-3" aria-hidden /> Your target
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {target ? (
                    <Link
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#0D9488] underline"
                      to={ROUTES.MY_GOALS.ROADMAP(target.goalId)}
                    >
                      <Map className="h-3.5 w-3.5" aria-hidden /> View roadmap
                    </Link>
                  ) : (
                    targetsOn && (
                      <Link
                        className="text-sm font-semibold text-[#0D9488] underline"
                        to={ROUTES.JOB_FIT.detail(job.jobId)}
                        aria-label={`Make ${title} my target`}
                      >
                        Make this my target
                      </Link>
                    )
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={remove.isPending}
                    aria-label={`Remove ${title} from favorites`}
                    onClick={() => remove.mutate(job.jobId)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {remove.isError && (
        <p role="alert" className="mt-2 text-sm text-[#B91C1C]">
          {savedJobErrorText(remove.error)}
        </p>
      )}
    </section>
  )
}
