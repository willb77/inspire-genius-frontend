import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getAidIntake, saveAidIntake } from "@/services/grant/intake.service"
import type { AidIntakeProfile, PartialAidIntake } from "@/types/grant/intake"
import { fromIntakePayload, toIntakePayload } from "@/types/grant/intake"
import { USE_GRANT_MOCKS } from "./mocks"

const intakeKey = (studentId: string) => ["grant", "aid-intake", studentId] as const

/**
 * The student's saved aid-intake profile (GET /v1/students/{id}/aid-intake),
 * mock-backed for UI-1. Starts empty so the interactive intake begins fresh.
 */
export function useAidIntake(
  studentId = "me",
  options?: Partial<UseQueryOptions<PartialAidIntake, AxiosError>>
) {
  return useQuery<PartialAidIntake, AxiosError>({
    queryKey: intakeKey(studentId),
    queryFn: async () => {
      if (USE_GRANT_MOCKS) return {}
      const res = await getAidIntake(studentId)
      return fromIntakePayload(res.data ?? {})
    },
    ...options,
  })
}

/**
 * Persist the completed aid-intake profile. On success, seeds the intake query
 * cache so the profile reads back immediately without a refetch.
 */
export function useSaveAidIntake(studentId = "me") {
  const qc = useQueryClient()
  return useMutation<AidIntakeProfile, AxiosError, AidIntakeProfile>({
    mutationFn: async (profile) => {
      // Reshape the flat form values into the nested backend IntakeProfile
      // (screener/modules/mirrors) before persisting.
      if (!USE_GRANT_MOCKS) await saveAidIntake(studentId, toIntakePayload(profile))
      return profile
    },
    onSuccess: (saved) => {
      qc.setQueryData(intakeKey(studentId), saved)
      // The dashboard/scholarship views read the student profile — nudge them.
      qc.invalidateQueries({ queryKey: ["grant", "profile", studentId] })
    },
  })
}
