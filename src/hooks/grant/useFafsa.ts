import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query"
import type { AxiosError } from "axios"

import {
  generateFafsaPacket,
  getFafsaApplication,
  getFafsaCompleteness,
  getFafsaFieldCatalog,
  getFafsaHandoff,
  setFafsaHandoffStep,
  updateFafsaSections,
} from "@/services/grant/fafsa.service"
import type {
  FafsaApplication,
  FafsaCompleteness,
  FafsaFieldCatalog,
  FafsaHandoff,
  FafsaPacket,
} from "@/types/grant"
import {
  MOCK_FAFSA_APPLICATION,
  MOCK_FAFSA_COMPLETENESS,
  MOCK_FAFSA_FIELD_CATALOG,
  MOCK_FAFSA_HANDOFF,
  MOCK_FAFSA_PACKET,
  USE_GRANT_MOCKS,
} from "./mocks"

// FAFSA Application Concierge — React Query wrappers over the fafsa service.
// Each query falls back to the fixture layer when USE_GRANT_MOCKS is on so the
// page renders (and its smoke test passes) without a live backend.

const keys = {
  application: (year?: string) => ["grant", "fafsa", "application", year ?? "current"] as const,
  catalog: () => ["grant", "fafsa", "catalog"] as const,
  completeness: (year?: string) => ["grant", "fafsa", "completeness", year ?? "current"] as const,
  handoff: (year?: string) => ["grant", "fafsa", "handoff", year ?? "current"] as const,
}

/** GET /fafsa/field-catalog — the static field registry (drives the collect form). */
export function useFafsaFieldCatalog(
  options?: Partial<UseQueryOptions<FafsaFieldCatalog, AxiosError>>
) {
  return useQuery<FafsaFieldCatalog, AxiosError>({
    queryKey: keys.catalog(),
    queryFn: async () => {
      if (USE_GRANT_MOCKS) return MOCK_FAFSA_FIELD_CATALOG
      const res = await getFafsaFieldCatalog()
      return res.data ?? { sections: [] }
    },
    staleTime: 60 * 60 * 1000, // the catalog is effectively static within a session
    ...options,
  })
}

/** GET /fafsa/application — the student's FAFSA application (get-or-create). */
export function useFafsaApplication(
  awardYear?: string,
  options?: Partial<UseQueryOptions<FafsaApplication, AxiosError>>
) {
  return useQuery<FafsaApplication, AxiosError>({
    queryKey: keys.application(awardYear),
    queryFn: async () => {
      if (USE_GRANT_MOCKS) return MOCK_FAFSA_APPLICATION
      const res = await getFafsaApplication(awardYear)
      return res.data as FafsaApplication
    },
    ...options,
  })
}

/** GET /fafsa/application/completeness — per-section + overall completeness. */
export function useFafsaCompleteness(
  awardYear?: string,
  options?: Partial<UseQueryOptions<FafsaCompleteness, AxiosError>>
) {
  return useQuery<FafsaCompleteness, AxiosError>({
    queryKey: keys.completeness(awardYear),
    queryFn: async () => {
      if (USE_GRANT_MOCKS) return MOCK_FAFSA_COMPLETENESS
      const res = await getFafsaCompleteness(awardYear)
      return res.data as FafsaCompleteness
    },
    ...options,
  })
}

/** GET /fafsa/application/handoff — the ordered StudentAid.gov handoff checklist. */
export function useFafsaHandoff(
  awardYear?: string,
  options?: Partial<UseQueryOptions<FafsaHandoff, AxiosError>>
) {
  return useQuery<FafsaHandoff, AxiosError>({
    queryKey: keys.handoff(awardYear),
    queryFn: async () => {
      if (USE_GRANT_MOCKS) return MOCK_FAFSA_HANDOFF
      const res = await getFafsaHandoff(awardYear)
      return res.data as FafsaHandoff
    },
    ...options,
  })
}

/** PATCH /fafsa/application/sections — merge collected non-tax answers. */
export function useUpdateFafsaSections(awardYear?: string) {
  const qc = useQueryClient()
  return useMutation<FafsaApplication, AxiosError, Record<string, unknown>>({
    mutationFn: async (patch) => {
      if (USE_GRANT_MOCKS) {
        return {
          ...MOCK_FAFSA_APPLICATION,
          sections: { ...MOCK_FAFSA_APPLICATION.sections, ...patch },
        }
      }
      const res = await updateFafsaSections(patch, awardYear)
      return res.data as FafsaApplication
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.application(awardYear) })
      qc.invalidateQueries({ queryKey: keys.completeness(awardYear) })
      qc.invalidateQueries({ queryKey: keys.handoff(awardYear) })
    },
  })
}

/** POST /fafsa/application/packet — generate + persist the prep packet. */
export function useGenerateFafsaPacket(awardYear?: string) {
  const qc = useQueryClient()
  return useMutation<FafsaPacket, AxiosError, void>({
    mutationFn: async () => {
      if (USE_GRANT_MOCKS) return MOCK_FAFSA_PACKET
      const res = await generateFafsaPacket(awardYear)
      return (res.data?.packet as FafsaPacket) ?? MOCK_FAFSA_PACKET
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.application(awardYear) })
      qc.invalidateQueries({ queryKey: keys.completeness(awardYear) })
    },
  })
}

/** PATCH /fafsa/application/handoff/{stepId} — mark a step pending/complete. */
export function useSetFafsaHandoffStep(awardYear?: string) {
  const qc = useQueryClient()
  return useMutation<
    FafsaHandoff,
    AxiosError,
    { stepId: string; status: "pending" | "complete" }
  >({
    mutationFn: async ({ stepId, status }) => {
      if (USE_GRANT_MOCKS) {
        return {
          ...MOCK_FAFSA_HANDOFF,
          steps: MOCK_FAFSA_HANDOFF.steps.map((s) =>
            s.id === stepId ? { ...s, status } : s
          ),
        }
      }
      const res = await setFafsaHandoffStep(stepId, status, awardYear)
      return res.data as FafsaHandoff
    },
    onSuccess: (data) => {
      qc.setQueryData(keys.handoff(awardYear), data)
      qc.invalidateQueries({ queryKey: keys.application(awardYear) })
    },
  })
}
