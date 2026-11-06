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

export function useCohortReadout(since?: string) {
  return useQuery({
    queryKey: [KEY, "data", since ?? ""],
    queryFn: () => getCohortReadout(since),
    retry: false,
  })
}

export function useCohortReadoutExport() {
  return useMutation({
    mutationFn: ({ format, since }: { format: CohortExportFormat; since?: string }) =>
      exportCohortReadout(format, since),
  })
}
