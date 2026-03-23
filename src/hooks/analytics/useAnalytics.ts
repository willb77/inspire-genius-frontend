import { useQuery } from "@tanstack/react-query"
import { getUserAnalytics, getManagerAnalytics, getCompanyAnalytics, getPractitionerAnalytics, getDistributorAnalytics, getPlatformAnalytics } from "@/services/analytics/analytics.service"

export function useUserAnalytics() {
  return useQuery({ queryKey: ["analytics-user"], queryFn: async () => { const r = await getUserAnalytics(); return r.data?.data } })
}
export function useManagerAnalytics() {
  return useQuery({ queryKey: ["analytics-manager"], queryFn: async () => { const r = await getManagerAnalytics(); return r.data?.data } })
}
export function useCompanyAnalytics() {
  return useQuery({ queryKey: ["analytics-company"], queryFn: async () => { const r = await getCompanyAnalytics(); return r.data?.data } })
}
export function usePractitionerAnalytics() {
  return useQuery({ queryKey: ["analytics-practitioner"], queryFn: async () => { const r = await getPractitionerAnalytics(); return r.data?.data } })
}
export function useDistributorAnalytics() {
  return useQuery({ queryKey: ["analytics-distributor"], queryFn: async () => { const r = await getDistributorAnalytics(); return r.data?.data } })
}
export function usePlatformAnalytics() {
  return useQuery({ queryKey: ["analytics-platform"], queryFn: async () => { const r = await getPlatformAnalytics(); return r.data?.data } })
}
