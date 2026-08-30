import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type { ManagerTeamResponse } from "@/types/manager/team"

/** The manager's direct reports. Typed against {@link ManagerTeamResponse} —
 *  `members: unknown[]` is what let a page render six hardcoded fallback people
 *  without the compiler noticing they were not this shape. */
export function getManagerTeam() {
  return api.get<BaseApiResponse<ManagerTeamResponse>>("/api/manager/team")
}

export function getManagerHiringStats() {
  return api.get<BaseApiResponse<{ openPositions: number; totalCandidates: number; interviewsThisWeek: number; avgTimeToHire: number }>>("/api/manager/hiring/stats")
}

export function getManagerInterviews() {
  return api.get<BaseApiResponse<{ interviews: unknown[]; total: number }>>("/api/manager/hiring/interviews")
}

export function getManagerCandidates() {
  return api.get<BaseApiResponse<{ candidates: unknown[]; total: number }>>("/api/manager/hiring/candidates")
}

export function getManagerInterviewSchedule() {
  return api.get<BaseApiResponse<{ interviews: unknown[]; total: number }>>("/api/manager/interviews/schedule")
}

export function getManagerTraining() {
  return api.get<BaseApiResponse<{ programs: unknown[]; total: number }>>("/api/manager/training")
}

export function getManagerCareerPaths() {
  return api.get<BaseApiResponse<{ paths: unknown[]; total: number }>>("/api/manager/career-paths")
}

export function getManagerTeamComposition() {
  return api.get<BaseApiResponse<{ members: unknown[]; prismDistribution: unknown }>>("/api/manager/team/composition")
}

export function getManagerLeadership() {
  return api.get<BaseApiResponse<{ leaders: unknown[]; total: number }>>("/api/manager/leadership")
}
