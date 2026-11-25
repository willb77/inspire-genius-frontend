import ScenarioPanel from "@/components/prism/studio/ScenarioPanel"
import { useStudioCast } from "@/hooks/manager/development/useStudioCast"
import { useTeamCast } from "@/hooks/manager/development/useTeamCast"
import {
  useTeamScenarioStore,
  useTeamViewScenarioStore,
} from "@/hooks/manager/development/useSavedRuns"
import { useTeamStudioScenario } from "@/hooks/useTeamStudio"
import { withPrism } from "@/lib/withPrism"
import { TEAM_STUDIO_SCENARIO_COPY } from "./studioCopy"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation("managerPages")
  const cast = useStudioCast()
  const port = useTeamStudioScenario(cast.port, cast.resolve)
  const store = useTeamScenarioStore(memberId)

  return (
    <div className="space-y-3">
      {cast.withoutPrism > 0 && (
        <p className="text-xs text-slate-500">{cast.withoutPrism === 1 ? t("teamScenarioPanel.withoutPrismOne", { defaultValue: "{{withoutPrism}} team member is not listed — they have no PRISM on file. Invite them from the roster.", withoutPrism: cast.withoutPrism }) : t("teamScenarioPanel.withoutPrismOther", { defaultValue: "{{withoutPrism}} team members are not listed — they have no PRISM on file. Invite them from the roster.", withoutPrism: cast.withoutPrism })}</p>
      )}
      <ScenarioPanel port={{ ...port, store }} copy={TEAM_STUDIO_SCENARIO_COPY} />
    </div>
  )
}

/**
 * U5 — the same scenario panel at Studio level (the Team view).
 *
 * The cast is `useTeamCast` (only people who share their PRISM with the
 * caller), and a kept run is filed under the first person in it, marked as a
 * Team-view run (see `useTeamViewScenarioStore`). The member-page binding above
 * is unchanged, so scenarios kept there stay listed there (decision D2).
 */
export function TeamViewScenarioPanel() {
  const { t } = useTranslation("managerPages")
  const notShared = t("teamStudioView.notSharedError", { defaultValue: "One of the people you chose does not share their PRISM with you, so they cannot be included." })
  const cast = useTeamCast(notShared)
  const port = useTeamStudioScenario(cast.port, cast.resolve)
  const store = useTeamViewScenarioStore(cast, notShared)

  const copy = {
    ...TEAM_STUDIO_SCENARIO_COPY,
    castEmpty: withPrism(
      t("teamStudioView.castEmpty", { defaultValue: "Nobody on your roster shares their PRISM with you yet. Only people who have shared it can be picked here. You can ask from a person's page." }),
    ),
    savedBlurb: t("teamStudioView.savedBlurb", { defaultValue: "Only you can see what you keep here. Each run is filed under the first person in it, and also shows on that person's page." }),
  }

  return (
    <div className="space-y-3">
      {cast.notShared > 0 && (
        <p className="text-xs text-slate-500" data-testid="team-view-not-shared">
          {withPrism(
            cast.notShared === 1
              ? t("teamStudioView.notSharedOne", { defaultValue: "{{n}} person with PRISM on file is not listed: they have not shared PRISM with you, or their sharing could not be checked.", n: cast.notShared,
                })
              : t("teamStudioView.notSharedOther", { defaultValue: "{{n}} people with PRISM on file are not listed: they have not shared PRISM with you, or their sharing could not be checked.", n: cast.notShared,
                }),
          )}
        </p>
      )}
      <ScenarioPanel port={{ ...port, store }} copy={copy} />
    </div>
  )
}

export default TeamScenarioPanel
