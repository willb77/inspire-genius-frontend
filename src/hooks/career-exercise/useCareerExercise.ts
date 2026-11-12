import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getMySessions,
  pauseMySession,
  resumeMySession,
  startMySession,
} from "@/services/career-exercise/student.service"
import { getOccupation, getOccupationPay } from "@/services/job-fit/occupations.service"
import { occupationKeys } from "@/hooks/job-fit/useOccupation"
import type {
  ExerciseSession,
  PayWithVintage,
  ReadState,
  RoleCard,
  RoleFactReads,
  SessionOut,
  StartOut,
} from "@/types/career-exercise/student"
import type { OccupationDetail, OccupationRead } from "@/types/job-fit/occupations"

// The switch read is CX-6's (one query key for the whole app).
export { useCareerExerciseSwitch } from "@/hooks/career-exercise/useCounselorCareerExercise"

export const myExerciseKeys = {
  sessions: ["career-exercise", "mine"] as const,
}

/** My sessions, newest first. Idle until `enabled` (the switch is on). */
export function useMyExerciseSessions(enabled: boolean) {
  return useQuery({
    queryKey: myExerciseKeys.sessions,
    queryFn: getMySessions,
    enabled,
    staleTime: 15_000,
    retry: false,
  })
}

/** The session the page works on: the newest open one, else the newest. */
export function currentSession(sessions: ExerciseSession[] | undefined): ExerciseSession | null {
  if (!sessions || sessions.length === 0) return null
  return sessions.find((s) => s.status !== "closed") ?? sessions[0]
}

export function useStartExercise() {
  const qc = useQueryClient()
  return useMutation<StartOut, AxiosError>({
    mutationFn: startMySession,
    onSettled: () => qc.invalidateQueries({ queryKey: myExerciseKeys.sessions }),
  })
}

type Versioned = { sessionId: string; version: number }

export function usePauseExercise() {
  const qc = useQueryClient()
  return useMutation<SessionOut, AxiosError, Versioned>({
    mutationFn: ({ sessionId, version }) => pauseMySession(sessionId, version),
    onSettled: () => qc.invalidateQueries({ queryKey: myExerciseKeys.sessions }),
  })
}

export function useResumeExercise() {
  const qc = useQueryClient()
  return useMutation<SessionOut, AxiosError, Versioned>({
    mutationFn: ({ sessionId, version }) => resumeMySession(sessionId, version),
    onSettled: () => qc.invalidateQueries({ queryKey: myExerciseKeys.sessions }),
  })
}

/** Re-read my sessions (after a chat turn the exercise may have saved a stage). */
export function useRefreshMyExercise(): () => void {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: myExerciseKeys.sessions })
  }
}

function asRead<T>(q: { status: "pending" | "error" | "success"; data: unknown }): ReadState<T> {
  return { status: q.status, data: q.data as OccupationRead<T> | undefined }
}

/**
 * OD-4's pay and occupation reads for each role, keyed by `onet_soc` — read
 * only to confirm each stored figure's data year (and an empty read's reason).
 * The figures the page shows are always the stored ones.
 */
export function useRoleFactReads(roles: RoleCard[]): Record<string, RoleFactReads> {
  const codes = Array.from(new Set(roles.map((r) => r.onet_soc)))
  const pay = useQueries({
    queries: codes.map((code) => ({
      queryKey: occupationKeys.pay(code),
      queryFn: () => getOccupationPay(code),
      staleTime: 60 * 60_000,
      retry: false,
    })),
  })
  const detail = useQueries({
    queries: codes.map((code) => ({
      queryKey: occupationKeys.detail(code),
      queryFn: () => getOccupation(code),
      staleTime: 60 * 60_000,
      retry: false,
    })),
  })
  const out: Record<string, RoleFactReads> = {}
  codes.forEach((code, i) => {
    out[code] = {
      pay: asRead<PayWithVintage>(pay[i]),
      education: asRead<OccupationDetail>(detail[i]),
    }
  })
  return out
}
