import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"

export function getUserAnalytics() {
  return api.get<BaseApiResponse<unknown>>("/api/analytics/user")
}
export function getManagerAnalytics() {
  return api.get<BaseApiResponse<unknown>>("/api/analytics/manager")
}
export function getCompanyAnalytics() {
  return api.get<BaseApiResponse<unknown>>("/api/analytics/company")
}
export function getPractitionerAnalytics() {
  return api.get<BaseApiResponse<unknown>>("/api/analytics/practitioner")
}
export function getDistributorAnalytics() {
  return api.get<BaseApiResponse<unknown>>("/api/analytics/distributor")
}
export function getPlatformAnalytics() {
  return api.get<BaseApiResponse<unknown>>("/api/analytics/platform")
}
