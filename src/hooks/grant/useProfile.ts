import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { getStudentProfile } from "@/services/grant/profile.service"
import type { StudentProfile } from "@/types/grant"
import { MOCK_STUDENT_PROFILE, USE_GRANT_MOCKS } from "./mocks"

/** Student financial-aid profile (GET /v1/students/{id}), mock-backed for UI-0. */
export function useStudentProfile(
  studentId = "me",
  options?: Partial<UseQueryOptions<StudentProfile, AxiosError>>
) {
  return useQuery<StudentProfile, AxiosError>({
    queryKey: ["grant", "profile", studentId],
    queryFn: async () => {
      if (USE_GRANT_MOCKS) return MOCK_STUDENT_PROFILE
      const res = await getStudentProfile(studentId)
      return res.data as StudentProfile
    },
    ...options,
  })
}
