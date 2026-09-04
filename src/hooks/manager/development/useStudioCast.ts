import { useCallback, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  getMemberDossier,
  getMemberFullPrism,
} from "@/services/manager/development/growthService"
import { bestSubject, type StudioSubject } from "@/hooks/useTeamStudio"
import type { SubjectListPort } from "@/components/prism/studio/ports"
import type {
  FullPrismProfileResponse,
  MemberDossier,
  RosterMember,
} from "@/types/development"
import type { ProfileSummary } from "@/types/character-lab"
import { developmentKeys } from "./queryKeys"
import { useTeamDevelopmentRoster } from "./useTeamDevelopmentRoster"

/**
 * The team, as a cast the shared PRISM studio panels can pick from.
 *
 * Two halves, deliberately separate:
 *
 *   - the LIST is built from the roster, which is one cheap call and already
 *     cached by the Studio's grid;
 *   - the SUBJECTS are resolved only for the ids actually chosen, because a
 *     member's scores live in their dossier and computing one is a ~60s agent
 *     job. Populating a picker of twenty people would be twenty of those, for
 *     names nobody selected.
 *
 * Members without PRISM on file are EXCLUDED from the list rather than shown
 * and refused later. A narrative generated from no scores is confident prose
 * about nothing, and it would be indistinguishable from a real reading — the
 * failure mode this whole surface is built to avoid. The count of who was left
 * out is returned so the caller can say so out loud.
 */
export type StudioCast = {
  port: SubjectListPort
  /** Fetches (or reuses) each chosen member's dossier and maps it to a subject. */
  resolve: (ids: string[]) => Promise<StudioSubject[]>
  /** Roster members hidden because they have no PRISM on file. */
  withoutPrism: number
}

/** Roster rows are not profiles; the picker wants the Character Lab's row shape. */
function toSummary(m: RosterMember): ProfileSummary {
  return {
    id: m.memberId,
    name: m.name,
    source: m.title ?? "",
    notes: "",
    // No `scored`. The roster carries no scale count, and the previous `0` was
    // not a cautious placeholder — it was false. This list is FILTERED to people
    // whose PRISM exists (`coverage.prism`), so every row it renders had scores
    // on file while the picker said they had none, in the one place an operator
    // decides whether someone is worth including. `ProfileSummary.scored` is
    // optional so omission means "not counted" and the picker prints nothing.
    //
    // Getting a real number here means the roster carrying one, which is a
    // query per member over `assessment_scores` on a live endpoint. Not worth
    // that for a label; worth saying nothing rather than something untrue.
    has_analysis: false,
    created_at: null,
    updated_at: m.coverage.prismAssessedAt ?? null,
  }
}

export function useStudioCast(): StudioCast {
  const roster = useTeamDevelopmentRoster()
  const qc = useQueryClient()

  const withPrism = useMemo(
    () => (roster.data ?? []).filter((m) => m.coverage.prism),
    [roster.data],
  )

  const port: SubjectListPort = {
    subjects: roster.data ? withPrism.map(toSummary) : undefined,
    isLoading: roster.isLoading,
    error: roster.error,
  }

  /**
   * Reads through the SAME query key `useMemberDossier` uses, so a member
   * already open in the workspace costs nothing and a member fetched here is
   * warm when their workspace is opened. `fetchQuery` rather than a bare
   * service call for exactly that reason.
   */
  const resolve = useCallback(
    async (ids: string[]): Promise<StudioSubject[]> => {
      const rows = await Promise.all(
        ids.map((id) =>
          qc.fetchQuery<MemberDossier | null>({
            queryKey: developmentKeys.dossier(id),
            queryFn: async () => {
              const r = await getMemberDossier(id)
              if (r.status === 202) return null
              return r.data?.data ?? null
            },
            staleTime: 60_000,
          }),
        ),
      )

      // The full profile, alongside the dossier rather than instead of it: the
      // dossier carries the name, the behaviour radar the brain map is derived
      // from, and the 202-still-computing signal; this carries every scale and
      // every score type. One plain read each, no agent, so it does not add to
      // the ~60s the dossier can cost.
      //
      // A failure here is NOT fatal. If the profile read is unavailable the
      // subject falls back to the behaviour radar, which is exactly today's
      // behaviour — an outage on the richer read must not take a working
      // surface down with it. A CONFLICTED profile is a different matter and
      // `bestSubject` throws on it.
      const fulls = await Promise.all(
        ids.map((id) =>
          qc
            .fetchQuery<FullPrismProfileResponse | null>({
              queryKey: developmentKeys.fullPrism(id),
              queryFn: async () => {
                const r = await getMemberFullPrism(id)
                return r.data?.data ?? null
              },
              staleTime: 60_000,
            })
            .catch(() => null),
        ),
      )

      return rows.flatMap((dossier, i) => {
        // A dossier still computing (202 → null) is NOT a person with no
        // scores. Dropping it silently would compare three people and title
        // the result with four names, so it fails loudly instead.
        if (!dossier) {
          throw new Error(
            "One of the people you chose is still being analysed. Try again in a moment.",
          )
        }
        const name =
          dossier.member.name || withPrism.find((m) => m.memberId === ids[i])?.name || "This member"
        return [bestSubject(name, fulls[i], dossier.profile)]
      })
    },
    [qc, withPrism],
  )

  return {
    port,
    resolve,
    withoutPrism: (roster.data ?? []).length - withPrism.length,
  }
}
