import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getCaseload,
  getCoachActivity,
  getCoachHome,
  getCoaches,
  getCoachSchedule,
  getFellow,
  getTeams,
} from "@/services/honor/coach.service"
import type {
  CoachActivityRow,
  CoachHome,
  CoachRecord,
  HonorFellow,
  ScheduleEvent,
  ScheduleView,
  TeamRecord,
} from "@/types/honor"
import {
  MOCK_ACTIVITY,
  MOCK_CASELOAD_COUNTS,
  MOCK_COACHES,
  MOCK_COACH_HOME,
  MOCK_FELLOWS,
  MOCK_SCHEDULE,
  MOCK_TEAMS,
  USE_HONOR_MOCKS,
} from "./mocks"

/**
 * Honor Coach Workbench — React Query read hooks.
 *
 * Each hook is mock-backed for the Phase-0 scaffold: when `USE_HONOR_MOCKS` is
 * true it resolves fixtures; otherwise it calls the (net-new) `/v1/coach/*`
 * service. Screens that reuse EXISTING real hooks (Meridian chat, PRISM,
 * documents) do not go through here — they wire straight to those hooks.
 */

const HK = "honor"

/** GET /v1/coach/home — dashboard hydration (counts, recent activity, next events). */
export function useCoachHome(options?: Partial<UseQueryOptions<CoachHome, AxiosError>>) {
  return useQuery<CoachHome, AxiosError>({
    queryKey: [HK, "home"],
    queryFn: async () => {
      if (USE_HONOR_MOCKS) {
        return {
          ...MOCK_COACH_HOME,
          counts: MOCK_CASELOAD_COUNTS,
          recentActivity: MOCK_ACTIVITY.slice(0, 4),
          upcomingEvents: MOCK_SCHEDULE.slice(0, 3),
        }
      }
      const res = await getCoachHome()
      return (
        res.data ?? {
          coachName: "",
          coachTitle: "",
          counts: { assigned: 0, assessed: 0, intakePending: 0 },
          recentActivity: [],
          upcomingEvents: [],
        }
      )
    },
    ...options,
  })
}

/** GET /v1/coach/members — the coach's assigned caseload. */
export function useCaseload(options?: Partial<UseQueryOptions<HonorFellow[], AxiosError>>) {
  return useQuery<HonorFellow[], AxiosError>({
    queryKey: [HK, "caseload"],
    queryFn: async () => {
      if (USE_HONOR_MOCKS) return MOCK_FELLOWS
      const res = await getCaseload()
      return res.data ?? []
    },
    ...options,
  })
}

/** GET /v1/coach/member/{id} — one assigned member. */
export function useFellow(
  id: string | undefined,
  options?: Partial<UseQueryOptions<HonorFellow | null, AxiosError>>
) {
  return useQuery<HonorFellow | null, AxiosError>({
    queryKey: [HK, "member", id ?? "none"],
    enabled: !!id,
    queryFn: async () => {
      if (USE_HONOR_MOCKS) return MOCK_FELLOWS.find((f) => f.id === id) ?? null
      const res = await getFellow(id as string)
      return res.data ?? null
    },
    ...options,
  })
}

/** GET /v1/coach/schedule?view=… — coach calendar. */
export function useCoachSchedule(
  view: ScheduleView,
  options?: Partial<UseQueryOptions<ScheduleEvent[], AxiosError>>
) {
  return useQuery<ScheduleEvent[], AxiosError>({
    queryKey: [HK, "schedule", view],
    queryFn: async () => {
      if (USE_HONOR_MOCKS) return MOCK_SCHEDULE
      const res = await getCoachSchedule(view)
      return res.data ?? []
    },
    ...options,
  })
}

/** GET /v1/audit/logs — JWT-scoped coach activity feed. */
export function useCoachActivity(options?: Partial<UseQueryOptions<CoachActivityRow[], AxiosError>>) {
  return useQuery<CoachActivityRow[], AxiosError>({
    queryKey: [HK, "activity"],
    queryFn: async () => {
      if (USE_HONOR_MOCKS) return MOCK_ACTIVITY
      const res = await getCoachActivity()
      return res.data ?? []
    },
    ...options,
  })
}

/** GET /v1/coach/team/coaches — administration coach roster. */
export function useCoaches(options?: Partial<UseQueryOptions<CoachRecord[], AxiosError>>) {
  return useQuery<CoachRecord[], AxiosError>({
    queryKey: [HK, "coaches"],
    queryFn: async () => {
      if (USE_HONOR_MOCKS) return MOCK_COACHES
      const res = await getCoaches()
      return res.data ?? []
    },
    ...options,
  })
}

/** GET /v1/coach/team/teams — administration team list. */
export function useTeams(options?: Partial<UseQueryOptions<TeamRecord[], AxiosError>>) {
  return useQuery<TeamRecord[], AxiosError>({
    queryKey: [HK, "teams"],
    queryFn: async () => {
      if (USE_HONOR_MOCKS) return MOCK_TEAMS
      const res = await getTeams()
      return res.data ?? []
    },
    ...options,
  })
}
