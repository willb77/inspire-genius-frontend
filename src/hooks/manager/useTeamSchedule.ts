import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createTeamSessions,
  getTeamSchedulePreferences,
  listTeamSchedule,
  saveTeamSchedulePreferences,
} from "@/services/manager/teamSchedule.service"
import type { TeamScheduleInput, TeamSchedulePreferences } from "@/types/manager/teamSchedule"

const TEAM_SCHEDULE_KEY = ["manager", "team-schedule"] as const
const PREFERENCES_KEY = ["manager", "team-schedule", "preferences"] as const

export function useTeamSchedule() {
  return useQuery({ queryKey: TEAM_SCHEDULE_KEY, queryFn: listTeamSchedule })
}

/** The caller's saved default location (MSCH-2). Shared by Settings and the Schedule form. */
export function useTeamSchedulePreferences() {
  return useQuery({ queryKey: PREFERENCES_KEY, queryFn: getTeamSchedulePreferences })
}

export function useSaveTeamSchedulePreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (prefs: TeamSchedulePreferences) => saveTeamSchedulePreferences(prefs),
    onSuccess: (saved) => qc.setQueryData(PREFERENCES_KEY, saved),
  })
}

export function useCreateTeamSessions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: TeamScheduleInput) => createTeamSessions(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: TEAM_SCHEDULE_KEY }),
  })
}
