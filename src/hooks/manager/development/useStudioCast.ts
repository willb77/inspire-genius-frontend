import { useCallback, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getMemberDossier } from "@/services/manager/development/growthService"
import { subjectFromProfile, type StudioSubject } from "@/hooks/useTeamStudio"
import type { SubjectListPort } from "@/components/prism/studio/ports"
import type { MemberDossier, RosterMember } from "@/types/development"
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
    // The picker prints "N scales scored". The roster does not carry a scale
    // count, and inventing one would put a number on screen that no request
    // produced — 0 reads as "nothing on file", which is what we mean for a row
    // we cannot count.
    scored: 0,
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
        return [subjectFromProfile(name, dossier.profile)]
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
