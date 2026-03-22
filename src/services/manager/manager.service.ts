import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"

export function getManagerTeam() {
  return api.get<BaseApiResponse<{ members: unknown[]; total: number }>>("/api/manager/team")
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
