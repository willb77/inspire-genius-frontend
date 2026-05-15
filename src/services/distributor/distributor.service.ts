import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"

export function getDistributorPractitioners() {
  return api.get<BaseApiResponse<{ practitioners: unknown[]; total: number }>>("/api/distributor/practitioners")
}

export function getDistributorCredits() {
  return api.get<BaseApiResponse<unknown>>("/api/distributor/credits")
}

export function getDistributorTransactions() {
  return api.get<BaseApiResponse<{ transactions: unknown[] }>>("/api/distributor/transactions")
}

export function getDistributorTerritory() {
  return api.get<BaseApiResponse<unknown>>("/api/distributor/territory")
}
