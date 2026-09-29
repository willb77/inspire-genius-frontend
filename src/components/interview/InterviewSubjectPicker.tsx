import { Label } from "@/components/ui/label"
import { useTeamDevelopmentRoster } from "@/hooks/manager/development/useTeamDevelopmentRoster"
import { useStudioInterviewSharingEnabled } from "@/hooks/switches/useStudioInterviewSharingEnabled"

/**
 * S-3 — link a DEVELOPMENT interview to a team member's development record.
 *
 * Mounted only under Studio's "Development / discovery" style (never Live,
 * never a selection session — D3). The source is the interviewer's Team
 * Development roster and nothing else (owner decision, 2026-09-26): it enumerates only
 * people the interviewer already has. Hidden while the server's
 * studio_interview_sharing switch is off. The member still decides who sees
 * it: the result reaches their dossier only under their `interviews` grant.
 */
export default function InterviewSubjectPicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (memberId: string | null) => void
}) {
  const enabled = useStudioInterviewSharingEnabled()
  const roster = useTeamDevelopmentRoster()
  if (!enabled) return null
  const members = roster.data ?? []
  return (
    <div className="space-y-1">
      <Label htmlFor="interview-subject">Add to a team member's development record (optional)</Label>
      <select
        id="interview-subject"
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={roster.isLoading}
      >
        <option value="">Don't link this interview</option>
        {members.map((m) => (
          <option key={m.memberId} value={m.memberId}>
            {m.name}
          </option>
        ))}
      </select>
      {roster.isError ? (
        <p className="text-xs text-red-600" role="alert">
          Couldn't load your team roster — the interview can still run unlinked.
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          The summary reaches their development record only if they share interviews with you.
        </p>
      )}
    </div>
  )
}
