import { useQuery } from "@tanstack/react-query"
import { getCompanyUsers, getCompanyAnalytics, getCompanyDepartments, getCompanyCosts } from "@/services/company-admin/company-admin.service"

export function useCompanyUsers() {
  return useQuery({ queryKey: ["company-users"], queryFn: async () => { const r = await getCompanyUsers(); return r.data?.data } })
}

export function useCompanyAnalytics() {
  return useQuery({ queryKey: ["company-analytics"], queryFn: async () => { const r = await getCompanyAnalytics(); return r.data?.data } })
}

export function useCompanyDepartments() {
  return useQuery({ queryKey: ["company-departments"], queryFn: async () => { const r = await getCompanyDepartments(); return r.data?.data } })
}

export function useCompanyCosts() {
  return useQuery({ queryKey: ["company-costs"], queryFn: async () => { const r = await getCompanyCosts(); return r.data?.data } })
}
