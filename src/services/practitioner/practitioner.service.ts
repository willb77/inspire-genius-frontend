import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"

export function getPractitionerSessions() {
  return api.get<BaseApiResponse<{ sessions: unknown[]; total: number }>>("/api/practitioner/sessions")
}

export function getPractitionerCredits() {
  return api.get<BaseApiResponse<unknown>>("/api/practitioner/credits")
}

export function getPractitionerFollowups() {
  return api.get<BaseApiResponse<{ followups: unknown[]; total: number }>>("/api/practitioner/followups")
}
