import { useQuery } from "@tanstack/react-query"
import {
  getManagerTeam,
  getManagerHiringStats,
  getManagerInterviews,
  getManagerCandidates,
  getManagerInterviewSchedule,
  getManagerTraining,
  getManagerCareerPaths,
  getManagerTeamComposition,
  getManagerLeadership,
} from "@/services/manager/manager.service"

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

export function useManagerCandidates() {
  return useQuery({
    queryKey: ["manager-candidates"],
    queryFn: async () => { const r = await getManagerCandidates(); return r.data?.data },
  })
}

export function useManagerInterviewSchedule() {
  return useQuery({
    queryKey: ["manager-interview-schedule"],
    queryFn: async () => { const r = await getManagerInterviewSchedule(); return r.data?.data },
  })
}

export function useManagerTraining() {
  return useQuery({
    queryKey: ["manager-training"],
    queryFn: async () => { const r = await getManagerTraining(); return r.data?.data },
  })
}

export function useManagerCareerPaths() {
  return useQuery({
    queryKey: ["manager-career-paths"],
    queryFn: async () => { const r = await getManagerCareerPaths(); return r.data?.data },
  })
}

export function useManagerTeamComposition() {
  return useQuery({
    queryKey: ["manager-team-composition"],
    queryFn: async () => { const r = await getManagerTeamComposition(); return r.data?.data },
  })
}

export function useManagerLeadership() {
  return useQuery({
    queryKey: ["manager-leadership"],
    queryFn: async () => { const r = await getManagerLeadership(); return r.data?.data },
  })
}
