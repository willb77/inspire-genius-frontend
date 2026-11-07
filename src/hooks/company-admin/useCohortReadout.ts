import { useMutation, useQuery } from "@tanstack/react-query"
import {
  exportCohortReadout,
  getCohortReadout,
  getCohortReadoutEnabled,
} from "@/services/company-admin/cohortReadout.service"
import type { CohortExportFormat } from "@/types/cohortReadout"

const KEY = "cohort-readout"

/** Menu gate: read only for a company-admin; absent while loading or on error. */
export function useCohortReadoutEnabled(enabled = true) {
  return useQuery({
    queryKey: [KEY, "status"],
    queryFn: getCohortReadoutEnabled,
    staleTime: 5 * 60_000,
    retry: false,
    enabled,
  })
}

/**
 * A super-admin's choice of organisation. Absent for a company-admin, whose
 * read-out is always their own org and whose call is unchanged.
 */
export type CohortReadoutScope = { orgId?: string }

export function useCohortReadout(since?: string, scope?: CohortReadoutScope) {
  const orgId = scope?.orgId || undefined
  return useQuery({
    queryKey: scope ? [KEY, "data", since ?? "", orgId ?? ""] : [KEY, "data", since ?? ""],
    queryFn: () => (scope ? getCohortReadout(since, orgId) : getCohortReadout(since)),
    retry: false,
    // A super-admin with no org picked makes no call: the server would 422.
    enabled: scope ? Boolean(orgId) : true,
  })
}

export function useCohortReadoutExport() {
  return useMutation({
    mutationFn: ({ format, since, orgId }: { format: CohortExportFormat; since?: string; orgId?: string }) =>
      orgId ? exportCohortReadout(format, since, orgId) : exportCohortReadout(format, since),
  })
}
