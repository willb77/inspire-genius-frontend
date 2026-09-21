/**
 * JobDnaCandidatePicker — link a live interview to a Job DNA candidate.
 *
 * The live-session backend accepts an optional `candidate_id` + `blueprint_id`
 * pair (both or neither). When both are sent, finalising the session writes a
 * scorecard DRAFT for that candidate on that Job DNA (IS-11c2) — the bridge
 * from a scored interview to the Job Studio scorecards. Until 2026-09-21 no
 * frontend surface sent the pair, so the write path was reachable only from a
 * script and every real interview finalised with "no candidate linked".
 *
 * Optional by design: an interview for a role that has no Job DNA, or a
 * candidate not yet in a pipeline, still runs exactly as before.
 */
import { useMemo, useState } from "react"
import { Link2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useJobDnaList } from "@/hooks/job-blueprint/useJobDna"
import { usePipeline } from "@/hooks/job-blueprint/useTriage"

export type JobDnaCandidateLink = {
  blueprint_id: string
  candidate_id: string
  display_name: string
  external_id?: string
}

type Props = {
  value: JobDnaCandidateLink | null
  onPick: (link: JobDnaCandidateLink) => void
  onClear: () => void
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"

export default function JobDnaCandidatePicker({ value, onPick, onClear }: Props) {
  const [blueprintId, setBlueprintId] = useState<string>(value?.blueprint_id ?? "")
  const jobDnas = useJobDnaList()
  const pipeline = usePipeline(blueprintId)

  const published = useMemo(
    () => (jobDnas.data ?? []).filter((j) => j.status === "active"),
    [jobDnas.data],
  )
  const candidates = pipeline.data ?? []

  if (value) {
    return (
      <div
        className="flex items-start justify-between gap-3 rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm"
        data-testid="job-dna-link"
      >
        <div>
          <div className="flex items-center gap-1.5 font-medium text-indigo-900">
            <Link2 className="h-4 w-4" aria-hidden /> Linked to a Job DNA candidate
          </div>
          <p className="mt-1 text-xs text-indigo-900/80">
            Finalising this interview writes a scorecard draft for {value.display_name}
            {value.external_id ? ` (${value.external_id})` : ""} on their Job DNA, for you to review
            before it counts.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClear} aria-label="Unlink candidate">
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed border-slate-300 p-3">
      <div>
        <div className="text-sm font-medium text-slate-800">Link to a Job DNA candidate (optional)</div>
        <p className="text-xs text-slate-600">
          Pick the role's Job DNA and the candidate from its pipeline. The scored interview then
          reaches their scorecard as a draft; otherwise it stays in this session only.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="job-dna-link-blueprint">Job DNA</Label>
          <select
            id="job-dna-link-blueprint"
            className={selectClass}
            value={blueprintId}
            onChange={(e) => setBlueprintId(e.target.value)}
            disabled={jobDnas.isLoading}
          >
            <option value="">{jobDnas.isLoading ? "Loading Job DNAs…" : "Choose a published Job DNA…"}</option>
            {published.map((j) => (
              <option key={j.id} value={j.id}>
                {j.roleTitle}
                {j.department ? ` — ${j.department}` : ""}
              </option>
            ))}
          </select>
          {jobDnas.isError ? (
            <p className="mt-1 text-xs text-red-600" role="alert">Could not load Job DNAs.</p>
          ) : !jobDnas.isLoading && published.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">No published Job DNAs yet.</p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="job-dna-link-candidate">Candidate</Label>
          <select
            id="job-dna-link-candidate"
            className={selectClass}
            value=""
            disabled={!blueprintId || pipeline.isLoading}
            onChange={(e) => {
              const c = candidates.find((x) => x.id === e.target.value)
              if (!c) return
              onPick({
                blueprint_id: blueprintId,
                candidate_id: c.id,
                display_name: c.name,
                external_id: c.code || undefined,
              })
            }}
          >
            <option value="">
              {!blueprintId ? "Pick a Job DNA first" : pipeline.isLoading ? "Loading candidates…" : "Choose a candidate…"}
            </option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.code ? ` (${c.code})` : ""}
              </option>
            ))}
          </select>
          {pipeline.isError ? (
            <p className="mt-1 text-xs text-red-600" role="alert">Could not load this Job DNA's pipeline.</p>
          ) : blueprintId && !pipeline.isLoading && candidates.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">No candidates in this pipeline yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
