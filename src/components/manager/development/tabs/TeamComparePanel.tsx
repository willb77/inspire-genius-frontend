import ComparePanel from "@/components/prism/studio/ComparePanel"
import { useStudioCast } from "@/hooks/manager/development/useStudioCast"
import { useTeamStudioCompare } from "@/hooks/useTeamStudio"
import { TEAM_STUDIO_COMPARE_COPY } from "./studioCopy"

/**
 * Team Development Studio's binding of the shared compare panel.
 *
 * The only file on this side that knows the comparison runs against
 * `/v1/agents/team-studio`. The panel itself takes a port and its words and can
 * reach nothing on its own — which is the point: the same component serves the
 * super-admin Character Lab, and neither caller can reach the other's backend.
 */
export function TeamComparePanel() {
  const cast = useStudioCast()
  const port = useTeamStudioCompare(cast.port, cast.resolve)

  return (
    <div className="space-y-3">
      {cast.withoutPrism > 0 && (
        <p className="text-xs text-slate-500">
          {cast.withoutPrism} team member{cast.withoutPrism === 1 ? " is" : "s are"} not listed —
          they have no PRISM on file. Invite them from the roster.
        </p>
      )}
      <ComparePanel port={port} copy={TEAM_STUDIO_COMPARE_COPY} />
    </div>
  )
}

export default TeamComparePanel
