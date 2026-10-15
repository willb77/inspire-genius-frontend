import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { createTeamSessions, listTeamSchedule } from "@/services/manager/teamSchedule.service"
import type { TeamScheduleInput } from "@/types/manager/teamSchedule"

const TEAM_SCHEDULE_KEY = ["manager", "team-schedule"] as const

export function useTeamSchedule() {
  return useQuery({ queryKey: TEAM_SCHEDULE_KEY, queryFn: listTeamSchedule })
}

export function useCreateTeamSessions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TeamScheduleInput) => createTeamSessions(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: TEAM_SCHEDULE_KEY }),
  })
}
