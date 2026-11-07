import { useQuery } from "@tanstack/react-query"
import { getPractitionerDetail } from "@/services/super-admin/practitioner-registry/practitionerDetail.service"

/**
 * The S2 drawer's counts for one practitioner; idle until a practitioner is chosen.
 *
 * Keyed under ["practitioner-registry", ...] so every registry mutation (which
 * invalidates that prefix) refreshes an open drawer too.
 */
export function usePractitionerDetail(practitionerSub: string | null) {
  return useQuery({
    queryKey: ["practitioner-registry", "detail", practitionerSub],
    queryFn: () => getPractitionerDetail(practitionerSub as string),
    enabled: !!practitionerSub,
  })
}
