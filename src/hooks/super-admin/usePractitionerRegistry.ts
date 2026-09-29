import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addPractitioner,
  assignClient,
  bulkAddPractitioners,
  editPractitioner,
  listAssignable,
  listRegions,
  listRegistry,
  regeneratePractitionerCode,
  setPractitionerActive,
} from "@/services/super-admin/practitioner-registry/practitionerRegistry.service"

const KEY = ["practitioner-registry"] as const

export function useRegistry(includeInactive = false) {
  return useQuery({
    queryKey: [...KEY, "list", includeInactive],
    queryFn: () => listRegistry(includeInactive),
  })
}

export function useRegistryRegions() {
  return useQuery({ queryKey: [...KEY, "regions"], queryFn: listRegions })
}

/** Practitioners in exactly this region and country; idle until both are chosen. */
export function useAssignablePractitioners(region: string, country: string) {
  return useQuery({
    queryKey: [...KEY, "assignable", region, country],
    queryFn: () => listAssignable(region, country),
    enabled: !!region && !!country,
  })
}

function useInvalidatingMutation<TIn, TOut>(fn: (input: TIn) => Promise<TOut>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useAddPractitioner() {
  return useInvalidatingMutation(addPractitioner)
}

export function useBulkAddPractitioners() {
  return useInvalidatingMutation(bulkAddPractitioners)
}

export function useEditPractitioner() {
  return useInvalidatingMutation(editPractitioner)
}

export function useSetPractitionerActive() {
  return useInvalidatingMutation(
    ({ practitionerSub, active }: { practitionerSub: string; active: boolean }) =>
      setPractitionerActive(practitionerSub, active),
  )
}

export function useAssignClient() {
  return useInvalidatingMutation(assignClient)
}

/** PC-1c: replace a practitioner's code; the old code stops resolving immediately. */
export function useRegeneratePractitionerCode() {
  return useInvalidatingMutation(regeneratePractitionerCode)
}
