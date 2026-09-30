import { useMemo } from "react"
import { SAVED_ANALYSIS_COPY } from "@/constants/development"
import { toSavedRun, toSavedScenario, type SavedRun } from "@/lib/savedAnalysis"
import type { AnalysisKind } from "@/services/manager/development/growthService"
import type { ScenarioStorePort } from "@/components/prism/studio/ports"
import {
  useDeleteAnalysis,
  useMemberAnalyses,
  useSaveAnalysis,
} from "./useMemberAnalyses"

/**
 * The Team Development Studio's saved-run store, bound to
 * `growth.team_studio_analyses` (TDS-3).
 *
 * Two shapes come out of here because the two consumers already exist and are
 * not the same: a generic {@link SavedRunsStore} for the write-up and the
 * comparison, and the shared ScenarioPanel's own `ScenarioStorePort` for the
 * scenario tab — which needs no panel change at all, because that port was
 * declared optional from the start precisely so a caller could arrive later.
 *
 * Everything here is per-manager AND per-member, enforced server-side from the
 * caller's signed sub. See `useMemberAnalyses`.
 */

/** What a panel needs to keep, list, re-open and delete its own runs. */
export type SavedRunsStore = {
  runs: SavedRun[] | undefined
  isLoading: boolean
  isError: boolean
  save: {
    run: (input: {
      title: string
      body: string
      subjectIds: string[]
      subjectNames: string[]
      notice: string
    }) => Promise<unknown>
    pending: boolean
  }
  remove: { run: (id: string) => Promise<unknown>; pending: boolean }
}

/**
 * One kind of saved run for one member.
 *
 * `body` goes to `content` and the rest to `inputs`. Both, deliberately: the
 * document has to be readable from the row on its own (a manager opening a
 * year-old comparison should not depend on `inputs` still parsing), and
 * `inputs` is what makes re-opening restore the cast and the notice rather
 * than a wall of text.
 */
export function useSavedRuns(
  memberId: string | undefined,
  kind: AnalysisKind,
  fallbackTitle: string,
): SavedRunsStore {
  const list = useMemberAnalyses(memberId, kind)
  const save = useSaveAnalysis(memberId)
  const remove = useDeleteAnalysis(memberId)

  const runs = useMemo(
    () => list.data?.map((row) => toSavedRun(row, fallbackTitle)),
    [list.data, fallbackTitle],
  )

  return {
    runs,
    isLoading: list.isLoading,
    isError: list.isError,
    save: {
      run: (input) =>
        save.mutateAsync({
          kind,
          title: input.title,
          content: input.body,
          inputs: {
            subjectIds: input.subjectIds,
            subjectNames: input.subjectNames,
            notice: input.notice,
          },
        }),
      pending: save.isPending,
    },
    remove: { run: (id) => remove.mutateAsync(id), pending: remove.isPending },
  }
}

/**
 * The scenario tab's store, in the shape the shared ScenarioPanel already
 * replays. Nothing in that panel changes.
 *
 * `content` is built here rather than taken from the panel because the panel
 * has no single string for a run — it holds one section per subject plus the
 * group read. Stitching them into one document is what makes the row readable
 * without `inputs`; the sections themselves also go to `inputs.result` so
 * "Open" restores them individually.
 *
 * The section order follows `profile_ids`, and each heading comes from
 * `character_names` at the SAME index — which is the order the panel built them
 * in. A heading taken from a lookup by id would silently caption one
 * colleague's read with another's name if an id were ever missing.
 */
export function useTeamScenarioStore(memberId: string | undefined): ScenarioStorePort {
  const list = useMemberAnalyses(memberId, "scenario")
  const save = useSaveAnalysis(memberId)
  const remove = useDeleteAnalysis(memberId)

  const scenarios = useMemo(
    () =>
      list.data?.map((row) =>
        toSavedScenario(row, SAVED_ANALYSIS_COPY.scenarioFallbackTitle),
      ),
    [list.data],
  )

  return {
    scenarios,
    isLoading: list.isLoading,
    // Reported, not swallowed. Without this the panel's `!scenarios?.length`
    // branch renders "Nothing kept yet." over a read that FAILED — telling a
    // manager their saved work is gone.
    isError: list.isError,
    save: {
      run: (body) => {
        const sections = body.profile_ids.map((id, i) => {
          const name = body.character_names[i] ?? id
          return `## ${name}\n\n${body.result.individual?.[id] ?? ""}`
        })
        if (body.result.collaborative) {
          sections.push(`## Together\n\n${body.result.collaborative}`)
        }
        return save.mutateAsync({
          kind: "scenario",
          title: body.title,
          content: sections.join("\n\n"),
          inputs: {
            subjectIds: body.profile_ids,
            subjectNames: body.character_names,
            situation: body.situation,
            // Keyed by subject id, plus the group read under COLLABORATIVE's
            // own key — the same shape the panel replays into.
            result: {
              individual: body.result.individual ?? {},
              collaborative: body.result.collaborative ?? "",
            },
          },
        })
      },
      pending: save.isPending,
    },
    remove: { run: (id) => remove.mutateAsync(id), pending: remove.isPending },
  }
}
