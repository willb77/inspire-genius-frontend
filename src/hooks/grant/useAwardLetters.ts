import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getAwardLetters } from "@/services/grant/awardLetter.service"
import type { AwardLetter } from "@/types/grant"
import { MOCK_AWARD_LETTERS, USE_GRANT_MOCKS } from "./mocks"

/** Parsed award letters for offer comparison (GET /v1/award-letters), mock-backed for UI-0. */
export function useAwardLetters(
  studentId?: string,
  options?: Partial<UseQueryOptions<AwardLetter[], AxiosError>>
) {
  return useQuery<AwardLetter[], AxiosError>({
    queryKey: ["grant", "award-letters", studentId ?? "me"],
    queryFn: async () => {
      if (USE_GRANT_MOCKS) return MOCK_AWARD_LETTERS
      const res = await getAwardLetters(studentId)
      return res.data ?? []
    },
    ...options,
  })
}
