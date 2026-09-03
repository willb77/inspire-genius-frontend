import ScenarioPanel from "@/components/prism/studio/ScenarioPanel"
import { useStudioCast } from "@/hooks/manager/development/useStudioCast"
import { useTeamStudioScenario } from "@/hooks/useTeamStudio"
import { TEAM_STUDIO_SCENARIO_COPY } from "./studioCopy"

/**
 * Team Development Studio's binding of the shared scenario panel.
 *
 * Passes no scenario store: there is nowhere to keep a run about a real person
 * yet, so the panel shows no "Keep this run" button and no saved list rather
 * than a button that reports success and saves nothing. See
 * `useTeamStudioScenario`.
 */
export function TeamScenarioPanel() {
  const cast = useStudioCast()
  const port = useTeamStudioScenario(cast.port, cast.resolve)

  return (
    <div className="space-y-3">
      {cast.withoutPrism > 0 && (
        <p className="text-xs text-slate-500">
          {cast.withoutPrism} team member{cast.withoutPrism === 1 ? " is" : "s are"} not listed —
          they have no PRISM on file. Invite them from the roster.
        </p>
      )}
      <ScenarioPanel port={port} copy={TEAM_STUDIO_SCENARIO_COPY} />
    </div>
  )
}

export default TeamScenarioPanel
