import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getDeadlines } from "@/services/grant/deadlines.service"
import type { Deadline } from "@/types/grant"
import { MOCK_DEADLINES, USE_GRANT_MOCKS } from "./mocks"

/** Aid deadlines (GET /v1/deadlines), mock-backed for UI-0. */
export function useDeadlines(
  studentId?: string,
  options?: Partial<UseQueryOptions<Deadline[], AxiosError>>
) {
  return useQuery<Deadline[], AxiosError>({
    queryKey: ["grant", "deadlines", studentId ?? "me"],
    queryFn: async () => {
      if (USE_GRANT_MOCKS) return MOCK_DEADLINES
      const res = await getDeadlines(studentId)
      return res.data ?? []
    },
    ...options,
  })
}
