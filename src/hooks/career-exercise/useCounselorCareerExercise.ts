import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  addStudentNote,
  confirmStudentPaths,
  getCareerExerciseEnabled,
  getStudentSessions,
} from "@/services/career-exercise/counselor.service"
import type { AddNoteIn, CounselorWriteOut } from "@/types/career-exercise/counselor"

export const counselorExerciseKeys = {
  enabled: ["career-exercise", "enabled"] as const,
  student: (studentId: string) => ["career-exercise", "student", studentId] as const,
}

/** `"on"` only when the server says the exercise is switched on for the
 * signed-in person. A failed read is `"off"` (missing row or failed read =
 * off); `"loading"` until the server has answered. */
export function useCareerExerciseSwitch(): "loading" | "on" | "off" {
  const q = useQuery({
    queryKey: counselorExerciseKeys.enabled,
    queryFn: getCareerExerciseEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  if (q.isPending) return "loading"
  return q.data === true ? "on" : "off"
}

/** A student's sessions, newest first. Idle until `enabled`. */
export function useStudentExerciseSessions(studentId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: counselorExerciseKeys.student(studentId ?? ""),
    queryFn: () => getStudentSessions(studentId as string),
    enabled: enabled && !!studentId,
    staleTime: 30_000,
    retry: false,
  })
}

export function useAddStudentNote(studentId: string) {
  const qc = useQueryClient()
  return useMutation<CounselorWriteOut, AxiosError, { sessionId: string; body: AddNoteIn }>({
    mutationFn: ({ sessionId, body }) => addStudentNote(studentId, sessionId, body),
    onSettled: () => qc.invalidateQueries({ queryKey: counselorExerciseKeys.student(studentId) }),
  })
}

export function useConfirmStudentPaths(studentId: string) {
  const qc = useQueryClient()
  return useMutation<CounselorWriteOut, AxiosError, { sessionId: string; version: number }>({
    mutationFn: ({ sessionId, version }) => confirmStudentPaths(studentId, sessionId, version),
    onSettled: () => qc.invalidateQueries({ queryKey: counselorExerciseKeys.student(studentId) }),
  })
}
