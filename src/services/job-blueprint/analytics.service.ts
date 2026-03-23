import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type { FunnelStage, AccuracyDataPoint, TimeToFillDataPoint, HiresByPeriod, BlueprintStats, ActivityItem } from '@/types/job-blueprint'

const BASE = '/v1/blueprint/analytics'

export const analyticsService = {
  getFunnel() {
    return api.get<BaseApiResponse<FunnelStage[]>>(`${BASE}/funnel`)
  },

  getAccuracy() {
    return api.get<BaseApiResponse<AccuracyDataPoint[]>>(`${BASE}/accuracy`)
  },

  getTimeToFill() {
    return api.get<BaseApiResponse<TimeToFillDataPoint[]>>(`${BASE}/time-to-fill`)
  },

  getHires(period: string = 'month') {
    return api.get<BaseApiResponse<HiresByPeriod[]>>(`${BASE}/hires`, { params: { period } })
  },

  getStats() {
    return api.get<BaseApiResponse<BlueprintStats>>(`${BASE}/stats`)
  },

  getActivity(limit: number = 5) {
    return api.get<BaseApiResponse<ActivityItem[]>>('/v1/blueprint/activity', { params: { limit } })
  },
}
