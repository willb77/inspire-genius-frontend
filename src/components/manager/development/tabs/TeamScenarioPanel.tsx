import ScenarioPanel from "@/components/prism/studio/ScenarioPanel"
import { useStudioCast } from "@/hooks/manager/development/useStudioCast"
import { useTeamScenarioStore } from "@/hooks/manager/development/useSavedRuns"
import { useTeamStudioScenario } from "@/hooks/useTeamStudio"
import { TEAM_STUDIO_SCENARIO_COPY } from "./studioCopy"

/**
 * Team Development Studio's binding of the shared scenario panel.
 *
 * TDS-3 gives it a store — `growth.team_studio_analyses`, scoped
 * `(manager_sub, member_id)` — so "Keep this run" and the saved list now render
 * and mean something. Until now this passed no store deliberately, because a
 * button that reports success and saves nothing is worse than no button; the
 * panel needed no change to gain one, which is what `store` being optional on
 * the port was for.
 *
 * `savedBlurb` in `studioCopy` was written for this moment and is now
 * reachable.
 */
export function TeamScenarioPanel({ memberId }: { memberId: string }) {
  const cast = useStudioCast()
  const port = useTeamStudioScenario(cast.port, cast.resolve)
  const store = useTeamScenarioStore(memberId)

  return (
    <div className="space-y-3">
      {cast.withoutPrism > 0 && (
        <p className="text-xs text-slate-500">
          {cast.withoutPrism} team member{cast.withoutPrism === 1 ? " is" : "s are"} not listed —
          they have no PRISM on file. Invite them from the roster.
        </p>
      )}
      <ScenarioPanel port={{ ...port, store }} copy={TEAM_STUDIO_SCENARIO_COPY} />
    </div>
  )
}

export default TeamScenarioPanel
