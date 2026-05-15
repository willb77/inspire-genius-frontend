import { useQuery } from "@tanstack/react-query"
import { getCompanyUsers, getCompanyDepartments, getCompanyCosts } from "@/services/company-admin/company-admin.service"
import { useCompanyAnalytics as useCompanyAnalyticsCanonical } from "@/hooks/analytics/useAnalytics"

export function useCompanyUsers() {
  return useQuery({ queryKey: ["company-users"], queryFn: async () => { const r = await getCompanyUsers(); return r.data?.data } })
}

/**
 * @deprecated Use `useCompanyAnalytics` from `@/hooks/analytics/useAnalytics` directly.
 * This re-export preserves existing imports during the dashboard rationalization migration.
 * TODO(wave-1): Update remaining caller (`src/pages/company-admin/Dashboard.tsx`) to import
 * from `@/hooks/analytics/useAnalytics` and delete this re-export.
 */
export const useCompanyAnalytics = useCompanyAnalyticsCanonical

export function useCompanyDepartments() {
  return useQuery({ queryKey: ["company-departments"], queryFn: async () => { const r = await getCompanyDepartments(); return r.data?.data } })
}

export function useCompanyCosts() {
  return useQuery({ queryKey: ["company-costs"], queryFn: async () => { const r = await getCompanyCosts(); return r.data?.data } })
}
