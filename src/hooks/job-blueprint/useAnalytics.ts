import { useQuery } from '@tanstack/react-query'
import { analyticsService } from '@/services/job-blueprint'

const KEYS = {
  all: ['blueprint-analytics'] as const,
  funnel: () => [...KEYS.all, 'funnel'] as const,
  accuracy: () => [...KEYS.all, 'accuracy'] as const,
  timeToFill: () => [...KEYS.all, 'time-to-fill'] as const,
  hires: (period: string) => [...KEYS.all, 'hires', period] as const,
  stats: () => [...KEYS.all, 'stats'] as const,
  activity: (limit: number) => [...KEYS.all, 'activity', limit] as const,
}

export function useBlueprintFunnel() {
  return useQuery({
    queryKey: KEYS.funnel(),
    queryFn: () => analyticsService.getFunnel().then(r => r.data.data ?? []),
  })
}

export function useBlueprintAccuracy() {
  return useQuery({
    queryKey: KEYS.accuracy(),
    queryFn: () => analyticsService.getAccuracy().then(r => r.data.data ?? []),
  })
}

export function useBlueprintTimeToFill() {
  return useQuery({
    queryKey: KEYS.timeToFill(),
    queryFn: () => analyticsService.getTimeToFill().then(r => r.data.data ?? []),
  })
}

export function useBlueprintHires(period: string = 'month') {
  return useQuery({
    queryKey: KEYS.hires(period),
    queryFn: () => analyticsService.getHires(period).then(r => r.data.data ?? []),
  })
}

export function useBlueprintStats() {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn: () => analyticsService.getStats().then(r => r.data.data),
  })
}

export function useBlueprintActivity(limit: number = 5) {
  return useQuery({
    queryKey: KEYS.activity(limit),
    queryFn: () => analyticsService.getActivity(limit).then(r => r.data.data ?? []),
  })
}
