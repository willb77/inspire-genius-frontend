import StudioScenarioPanel from "@/components/prism/studio/ScenarioPanel"
import type { ScenarioPort } from "@/components/prism/studio/ports"
import { CHARACTER_LAB_SCENARIO_COPY } from "./copy"
import {
  useDeleteScenario,
  useRunScenario,
  useSaveScenario,
  useSavedProfiles,
  useSavedScenarios,
} from "@/hooks/super-admin/useCharacterLab"

/**
 * Character Lab's binding of the shared scenario panel.
 *
 * The only place that knows scenarios run against `/v1/agents/character-lab`,
 * and the only caller that supplies a `store` — the Lab keeps its runs; a
 * manager surface reading a real person has nowhere to keep them and gets no
 * "Keep this run" button rather than a dead one.
 */
export default function ScenarioPanel() {
  const { data: profiles, isLoading } = useSavedProfiles()
  const { data: scenarios, isLoading: scenariosLoading } = useSavedScenarios()
  const run = useRunScenario()
  const save = useSaveScenario()
  const remove = useDeleteScenario()

  const port: ScenarioPort = {
    cast: { subjects: profiles, isLoading },
    run: {
      run: (profile_ids, situation, focus) =>
        run.mutateAsync({ profile_ids, situation, focus }),
      pending: run.isPending,
    },
    store: {
      scenarios,
      isLoading: scenariosLoading,
      save: { run: (body) => save.mutateAsync(body), pending: save.isPending },
      remove: { run: (id) => remove.mutateAsync(id), pending: remove.isPending },
    },
  }

  return <StudioScenarioPanel port={port} copy={CHARACTER_LAB_SCENARIO_COPY} />
}
