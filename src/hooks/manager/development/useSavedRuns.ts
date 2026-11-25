import { useCallback, useMemo } from "react"
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { SAVED_ANALYSIS_COPY } from "@/constants/development"
import { toSavedRun, toSavedScenario, type SavedRun } from "@/lib/savedAnalysis"
import {
  createMemberAnalysis,
  deleteMemberAnalysis,
  listMemberAnalyses,
  type AnalysisKind,
  type CreateAnalysisInput,
  type SavedAnalysis,
} from "@/services/manager/development/growthService"
import type { ScenarioStorePort } from "@/components/prism/studio/ports"
import {
  useDeleteAnalysis,
  useMemberAnalyses,
  useSaveAnalysis,
} from "./useMemberAnalyses"
import { developmentKeys } from "./queryKeys"
import { NotSharedError } from "./useTeamCast"

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

// ── U5 — the Studio-level Team view ─────────────────────────────────────────
//
// Decision D2 (2026-11-24): Compare and Scenarios belong to a team view, and
// runs already kept on a member stay shown on that member.
//
// The store is NOT changed. `growth.team_studio_analyses` is keyed
// `(manager_sub, member_id)` and its only routes are
// `/v1/growth/members/{member_id}/analyses[/{id}]`, each behind
// `assert_member_coaching_access` for that member. So a run kept in the Team
// view is filed under the FIRST person in it (the anchor), exactly as a
// member-page run is filed under its member, and is marked
// `inputs.origin = "team-view"`. Consequences, all deliberate:
//
//   - nothing already kept is rewritten, moved or deleted;
//   - the member page lists every run filed under that member, team-view runs
//     included, so a team run is never only reachable from here;
//   - the Team view lists team-view runs filed under the people it can pick
//     now. If the anchor stops sharing PRISM, the run leaves this list and
//     stays on the anchor's own page.
//
// A team-level row filed under no member would be a store change (a new route,
// and a member-less row the coaching gate cannot authorize). Not done here.

/** Marks a row kept from the Team view. Rows without it were kept on a member page. */
export const TEAM_VIEW_ORIGIN = "team-view"

function isTeamViewRow(row: SavedAnalysis): boolean {
  const inputs = row.inputs
  return Boolean(inputs && typeof inputs === "object" && inputs.origin === TEAM_VIEW_ORIGIN)
}

type FiledRow = { row: SavedAnalysis; filedUnder: string }

/** What the Team view needs from its cast to read and write runs. */
export type TeamRunsCast = {
  pickableIds: string[]
  isPickable: (id: string) => boolean
}

/**
 * Team-view rows of one kind, across every person the caller can pick.
 *
 * One read per person, through the SAME query key the member page uses
 * (`developmentKeys.analyses(memberId)`), so the two share a cache and a save
 * here refreshes that member's page too. `filedUnder` is the id the row was
 * READ under, not `row.memberId`, so a delete goes to the URL that listed it.
 *
 * One failed read makes the whole list an error rather than a shorter list: a
 * list missing one person's runs would read as "those were deleted".
 */
function useTeamViewRows(
  memberIds: string[],
  kind: AnalysisKind,
): { rows: FiledRow[] | undefined; isLoading: boolean; isError: boolean } {
  const combine = useCallback(
    (results: { data?: SavedAnalysis[]; isLoading: boolean; isError: boolean }[]) => {
      const isLoading = results.some((r) => r.isLoading)
      const isError = results.some((r) => r.isError)
      if (isLoading || isError) return { rows: undefined, isLoading, isError }
      const seen = new Set<string>()
      const out: FiledRow[] = []
      results.forEach((r, i) => {
        for (const row of r.data ?? []) {
          if (row.kind !== kind || !isTeamViewRow(row) || seen.has(row.id)) continue
          seen.add(row.id)
          out.push({ row, filedUnder: memberIds[i] })
        }
      })
      // Newest first across people. Each person's list already arrives newest
      // first; a row with no timestamp goes after the dated ones, in the order
      // it arrived, rather than being guessed into position.
      const rows = out
        .map((f, i) => ({ f, i, t: f.row.createdAt ? Date.parse(f.row.createdAt) : NaN }))
        .sort((a, b) => {
          const at = Number.isNaN(a.t) ? -Infinity : a.t
          const bt = Number.isNaN(b.t) ? -Infinity : b.t
          return bt - at || a.i - b.i
        })
        .map((x) => x.f)
      return { rows, isLoading, isError }
    },
    [memberIds, kind],
  )

  return useQueries({
    queries: memberIds.map((id) => ({
      queryKey: developmentKeys.analyses(id),
      queryFn: async (): Promise<SavedAnalysis[]> => {
        const r = await listMemberAnalyses(id)
        return r.data?.data?.analyses ?? []
      },
      staleTime: 30_000,
    })),
    combine,
  })
}

function useTeamViewMutations() {
  const qc = useQueryClient()
  const save = useMutation<SavedAnalysis, Error, { anchor: string; input: CreateAnalysisInput }>({
    mutationFn: async ({ anchor, input }) => {
      const r = await createMemberAnalysis(anchor, input)
      const data = r.data?.data
      // A 201 with no body is not a save (see useSaveAnalysis).
      if (!data?.id) throw new Error("It was not saved.")
      return data
    },
    onSuccess: (_d, { anchor }) => {
      qc.invalidateQueries({ queryKey: developmentKeys.analyses(anchor) })
    },
  })
  const remove = useMutation<string, Error, { memberId: string; id: string }>({
    mutationFn: async ({ memberId, id }) => {
      const r = await deleteMemberAnalysis(memberId, id)
      if (!r.data?.data?.deleted) throw new Error("It was not deleted.")
      return id
    },
    onSuccess: (_d, { memberId }) => {
      qc.invalidateQueries({ queryKey: developmentKeys.analyses(memberId) })
    },
  })
  return { save, remove }
}

/**
 * The anchor a team-view run is filed under: the first subject, and only when
 * EVERY subject is someone the caller can pick. A run naming a person who does
 * not share PRISM with the caller is refused here, before any request.
 */
function anchorFor(cast: TeamRunsCast, subjectIds: string[], notSharedMessage: string): string {
  if (!subjectIds.length || subjectIds.some((id) => !cast.isPickable(id))) {
    throw new NotSharedError(notSharedMessage)
  }
  return subjectIds[0]
}

/** The Team view's comparison store. Same shape as the member page's. */
export function useTeamViewSavedRuns(
  cast: TeamRunsCast,
  kind: AnalysisKind,
  fallbackTitle: string,
  notSharedMessage: string,
): SavedRunsStore & { filedUnder: (runId: string) => string | undefined } {
  const list = useTeamViewRows(cast.pickableIds, kind)
  const { save, remove } = useTeamViewMutations()

  const owner = useMemo(
    () => new Map((list.rows ?? []).map((f) => [f.row.id, f.filedUnder])),
    [list.rows],
  )
  const runs = useMemo(
    () => list.rows?.map((f) => toSavedRun(f.row, fallbackTitle)),
    [list.rows, fallbackTitle],
  )

  return {
    runs,
    isLoading: list.isLoading,
    isError: list.isError,
    filedUnder: (runId) => owner.get(runId),
    save: {
      run: async (input) => {
        const anchor = anchorFor(cast, input.subjectIds, notSharedMessage)
        return save.mutateAsync({
          anchor,
          input: {
            kind,
            title: input.title,
            content: input.body,
            inputs: {
              subjectIds: input.subjectIds,
              subjectNames: input.subjectNames,
              notice: input.notice,
              origin: TEAM_VIEW_ORIGIN,
            },
          },
        })
      },
      pending: save.isPending,
    },
    remove: {
      run: async (id) => {
        const memberId = owner.get(id)
        if (!memberId) throw new Error("It was not deleted.")
        return remove.mutateAsync({ memberId, id })
      },
      pending: remove.isPending,
    },
  }
}

/** The Team view's scenario store, in the shared ScenarioPanel's port shape. */
export function useTeamViewScenarioStore(
  cast: TeamRunsCast,
  notSharedMessage: string,
): ScenarioStorePort {
  const list = useTeamViewRows(cast.pickableIds, "scenario")
  const { save, remove } = useTeamViewMutations()

  const owner = useMemo(
    () => new Map((list.rows ?? []).map((f) => [f.row.id, f.filedUnder])),
    [list.rows],
  )
  const scenarios = useMemo(
    () =>
      list.rows?.map((f) =>
        toSavedScenario(f.row, SAVED_ANALYSIS_COPY.scenarioFallbackTitle),
      ),
    [list.rows],
  )

  return {
    scenarios,
    isLoading: list.isLoading,
    isError: list.isError,
    save: {
      run: async (body) => {
        const anchor = anchorFor(cast, body.profile_ids, notSharedMessage)
        // Same document and the same `inputs` as the member page writes, plus
        // the origin marker, so either page can re-open it.
        const sections = body.profile_ids.map((id, i) => {
          const name = body.character_names[i] ?? id
          return `## ${name}\n\n${body.result.individual?.[id] ?? ""}`
        })
        if (body.result.collaborative) {
          sections.push(`## Together\n\n${body.result.collaborative}`)
        }
        return save.mutateAsync({
          anchor,
          input: {
            kind: "scenario",
            title: body.title,
            content: sections.join("\n\n"),
            inputs: {
              subjectIds: body.profile_ids,
              subjectNames: body.character_names,
              situation: body.situation,
              result: {
                individual: body.result.individual ?? {},
                collaborative: body.result.collaborative ?? "",
              },
              origin: TEAM_VIEW_ORIGIN,
            },
          },
        })
      },
      pending: save.isPending,
    },
    remove: {
      run: async (id) => {
        const memberId = owner.get(id)
        if (!memberId) throw new Error("It was not deleted.")
        return remove.mutateAsync({ memberId, id })
      },
      pending: remove.isPending,
    },
  }
}
