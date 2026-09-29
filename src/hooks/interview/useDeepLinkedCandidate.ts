/**
 * JS-10 — resolve the candidate a deep link names into a picker link.
 *
 * Career Blueprint ▸ Candidates links to Live Interview with
 * `?blueprintId=…&candidateId=…`. Those are ids; the picker link also needs
 * the candidate's display name and code, which live on the pipeline row. So
 * this reads the Job DNA's pipeline (the same query the picker uses) and
 * finds the row. Every state is named: a missing row or a failed read must
 * not silently drop the link and start an UNLINKED interview — that would
 * finalise with "no candidate linked" for an interview the interviewer
 * believed was linked.
 */
import type { JobDnaCandidateLink } from "@/components/interview/JobDnaCandidatePicker"
import { usePipeline } from "@/hooks/job-blueprint/useTriage"

export type DeepLinkedCandidate = {
  /** The link to hand the picker, once resolved. */
  link: JobDnaCandidateLink | null
  /** `idle` = no deep link on the URL. */
  state: "idle" | "loading" | "ready" | "missing" | "error"
}

export function useDeepLinkedCandidate(blueprintId: string, candidateId: string): DeepLinkedCandidate {
  const pipeline = usePipeline(blueprintId)
  if (!blueprintId || !candidateId) return { link: null, state: "idle" }
  if (pipeline.isLoading) return { link: null, state: "loading" }
  if (pipeline.isError) return { link: null, state: "error" }
  const row = (pipeline.data ?? []).find((c) => c.id === candidateId)
  if (!row) return { link: null, state: "missing" }
  return {
    link: {
      blueprint_id: blueprintId,
      candidate_id: row.id,
      display_name: row.name,
      external_id: row.code || undefined,
    },
    state: "ready",
  }
}
