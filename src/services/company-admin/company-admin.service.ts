import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"

export function getCompanyUsers() {
  return api.get<BaseApiResponse<{ users: unknown[]; total: number }>>("/api/company/users")
}

export function getCompanyAnalytics() {
  return api.get<BaseApiResponse<{ totalUsers: number; activeUsers: number; avgPrismScore: number; trainingCompletion: number }>>("/api/company/analytics")
}

export function getCompanyDepartments() {
  return api.get<BaseApiResponse<{ departments: unknown[] }>>("/api/company/departments")
}

export function getCompanyCosts() {
  return api.get<BaseApiResponse<unknown>>("/api/company/costs")
}
