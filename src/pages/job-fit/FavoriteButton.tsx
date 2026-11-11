import { Heart, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  useRemoveSavedJob,
  useSaveJob,
  useSavedJobs,
  useSavedJobsEnabled,
} from "@/hooks/job-fit/useSavedJobs"
import { savedJobErrorText } from "@/pages/job-fit/_savedJobs"

/**
 * JF-7 — "Save to Favorites" on a job. Renders nothing until the server says
 * Favorites is on for this person (`job_fit_v2`), so with it off every page is
 * today's. Saved state comes from the server's list, never from a guess; a
 * favorite is an option, not the target ("Make this my target" stays its own
 * card and its own `goal_targets` path).
 */
export function FavoriteButton({ jobId, roleTitle }: { jobId: string; roleTitle?: string | null }) {
  const enabled = useSavedJobsEnabled()
  const list = useSavedJobs(enabled)
  const save = useSaveJob()
  const remove = useRemoveSavedJob()

  if (!enabled || !jobId) return null

  const saved = (list.data ?? []).some((j) => j.jobId === jobId)
  const pending = save.isPending || remove.isPending
  // Held while the list loads, so the first click cannot be the wrong one. If
  // the list read fails the button stays usable: a save is idempotent.
  const busy = pending || list.isLoading
  const failure = save.isError ? save.error : remove.isError ? remove.error : null

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant={saved ? "default" : "outline"}
        aria-pressed={saved}
        disabled={busy}
        onClick={() => {
          save.reset()
          remove.reset()
          if (saved) remove.mutate(jobId)
          else save.mutate({ jobId, roleTitle: roleTitle ?? null })
        }}
      >
        {pending ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <Heart className={saved ? "mr-1 h-3.5 w-3.5 fill-current" : "mr-1 h-3.5 w-3.5"} aria-hidden />
        )}
        {saved ? "Saved to Favorites" : "Save to Favorites"}
      </Button>
      {failure && (
        <p role="alert" className="text-xs text-[#B91C1C]">
          {savedJobErrorText(failure)}
        </p>
      )}
    </div>
  )
}
