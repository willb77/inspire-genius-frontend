import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listSavedRoles } from '@/services/knowledge-continuity/continuity.service'
import type { AggregatedRole } from '@/types/job-blueprint'
import { useJobDnaList } from './useJobDna'

/**
 * The KCE org key the "Blueprint a role" front-door saves roles under. Roles
 * blueprinted in the Knowledge Continuity Engine live here, so Job DNA reads the
 * same key to surface them — this is what makes roles created in another vertical
 * available on Job DNA surfaces.
 */
export const KCE_ORG_ID = 'kce-capture'

/**
 * Aggregate roles from BOTH verticals — Job DNA blueprints and KCE saved roles —
 * for the cross-vertical "Role" dropdown on Draft-a-blueprint. De-duped by
 * `role_title` (case-insensitive); Job DNA wins a collision so selecting it can
 * open the existing blueprint. KCE errors resolve to an empty list rather than
 * breaking the picker.
 */
export function useAllRoles(): { roles: AggregatedRole[]; isLoading: boolean } {
  const jobDnaList = useJobDnaList()

  const kce = useQuery({
    queryKey: ['job-dna', 'all-roles', 'kce', KCE_ORG_ID],
    queryFn: async () => {
      const res = await listSavedRoles(KCE_ORG_ID)
      return res.data?.roles ?? []
    },
    staleTime: 30 * 1000,
  })

  const roles = useMemo<AggregatedRole[]>(() => {
    const out: AggregatedRole[] = []
    const seen = new Set<string>()

    // Job DNA first so it wins de-dupe collisions.
    for (const jd of jobDnaList.data ?? []) {
      const key = jd.roleTitle.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push({ role_title: jd.roleTitle, source: 'job-dna', id: jd.id })
    }

    for (const r of kce.data ?? []) {
      const key = r.role_title.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push({ role_title: r.role_title, source: 'kce', node_count: r.node_count })
    }

    return out.sort((a, b) => a.role_title.localeCompare(b.role_title))
  }, [jobDnaList.data, kce.data])

  return { roles, isLoading: jobDnaList.isLoading || kce.isLoading }
}
