import { useQuery } from "@tanstack/react-query"
import { getManagerTeam, getManagerHiringStats, getManagerInterviews } from "@/services/manager/manager.service"

export function useManagerTeam() {
  return useQuery({
    queryKey: ["manager-team"],
    queryFn: async () => { const r = await getManagerTeam(); return r.data?.data },
  })
}

export function useManagerHiringStats() {
  return useQuery({
    queryKey: ["manager-hiring-stats"],
    queryFn: async () => { const r = await getManagerHiringStats(); return r.data?.data },
  })
}

export function useManagerInterviews() {
  return useQuery({
    queryKey: ["manager-interviews"],
    queryFn: async () => { const r = await getManagerInterviews(); return r.data?.data },
  })
}
