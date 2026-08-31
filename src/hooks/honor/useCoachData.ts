import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getCaseload,
  getCoachHome,
  getFellow,
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
  MOCK_COACH_HOME,
  MOCK_FELLOWS,
  MOCK_SCHEDULE,
  USE_HONOR_MOCKS,
  USE_HONOR_ROSTER_LIVE,
} from "./mocks"

/** Roster surfaces (caseload/member/dashboard) go live when ROSTER_LIVE is on. */
const ROSTER_MOCK = USE_HONOR_MOCKS && !USE_HONOR_ROSTER_LIVE

/**
 * Honor Coach Workbench — React Query read hooks.
 *
 * Each hook is mock-backed for the Phase-0 scaffold: when `USE_HONOR_MOCKS` is
 * true it resolves fixtures; otherwise it calls the coach.service wrappers, which
 * target EXISTING Core endpoints (Simplified Vertical Model — GRANT-style coach
 * roster, conversation/audit history, team reads). Screens backed by the shared
 * hooks (Meridian chat, PRISM, documents) wire straight to those hooks.
 */

const HK = "honor"

/** GET /v1/coach/home — dashboard hydration (counts, recent activity, next events). */
export function useCoachHome(options?: Partial<UseQueryOptions<CoachHome, AxiosError>>) {
  return useQuery<CoachHome, AxiosError>({
    queryKey: [HK, "home"],
    queryFn: async () => {
      if (ROSTER_MOCK) {
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
      if (ROSTER_MOCK) return MOCK_FELLOWS
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
      if (ROSTER_MOCK) return MOCK_FELLOWS.find((f) => f.id === id) ?? null
      const res = await getFellow(id as string)
      return res.data ?? null
    },
    ...options,
  })
}

/**
 * Coach calendar. No coach-scoped schedule endpoint exists on Core yet, so this
 * resolves to an honest empty state (the Schedule surface shows "No events
 * scheduled"). Wire to a real endpoint here once one ships.
 */
export function useCoachSchedule(
  view: ScheduleView,
  options?: Partial<UseQueryOptions<ScheduleEvent[], AxiosError>>
) {
  return useQuery<ScheduleEvent[], AxiosError>({
    queryKey: [HK, "schedule", view],
    queryFn: async () => [] as ScheduleEvent[],
    ...options,
  })
}

/**
 * Coach activity feed. There is no coach-scoped activity/audit endpoint on Core
 * yet (the platform's chat history is per-agent, not a coach caseload feed), so
 * this resolves to an honest empty state. Wire it here once a real endpoint ships.
 */
export function useCoachActivity(options?: Partial<UseQueryOptions<CoachActivityRow[], AxiosError>>) {
  return useQuery<CoachActivityRow[], AxiosError>({
    queryKey: [HK, "activity"],
    queryFn: async () => [] as CoachActivityRow[],
    ...options,
  })
}

/**
 * Administration coach roster. There is no coach-of-coaches management endpoint
 * on Core yet, so this resolves to an honest empty state rather than surfacing an
 * unrelated roster. Wire it here once a real endpoint ships.
 */
export function useCoaches(options?: Partial<UseQueryOptions<CoachRecord[], AxiosError>>) {
  return useQuery<CoachRecord[], AxiosError>({
    queryKey: [HK, "coaches"],
    queryFn: async () => [] as CoachRecord[],
    ...options,
  })
}

/** Administration team list — no dedicated Core endpoint yet; honest empty state. */
export function useTeams(options?: Partial<UseQueryOptions<TeamRecord[], AxiosError>>) {
  return useQuery<TeamRecord[], AxiosError>({
    queryKey: [HK, "teams"],
    queryFn: async () => [] as TeamRecord[],
    ...options,
  })
}
