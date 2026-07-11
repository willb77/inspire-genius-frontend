import { api } from "@/lib/axios"
import type { Deadline, GrantApiResponse } from "@/types/grant"

/** GET /v1/deadlines — federal/state/institutional/scholarship deadlines. */
export async function getDeadlines(studentId?: string) {
  const { data } = await api.get<GrantApiResponse<Deadline[]>>("/v1/deadlines", {
    params: studentId ? { student_id: studentId } : undefined,
  })
  return data
}
