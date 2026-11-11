import { agentApi } from "@/lib/agentApi"
import type {
  AddNoteIn,
  CounselorWriteOut,
  StudentSessions,
} from "@/types/career-exercise/counselor"

/**
 * CX-6 — a counselor's reads and writes on a student's career exercise. The
 * server decides every call with the can_view rule (the student's
 * `development` grant AND a counselor relationship); a refusal is a 403, never
 * an empty list. Nothing here sends the counselor's own id: the server takes
 * it from the token.
 */
const PREFIX = "/v1/agents/career-exercise"
type Envelope<T> = { status: boolean; data: T }

const student = (studentId: string) => `${PREFIX}/students/${encodeURIComponent(studentId)}`

/** Whether the exercise is switched on for the signed-in person. Not a
 * security check — every data route refuses itself while it is off. */
export async function getCareerExerciseEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<Envelope<{ enabled?: unknown }>>(`${PREFIX}/status`)
  return data?.data?.enabled === true
}

export async function getStudentSessions(studentId: string): Promise<StudentSessions> {
  const { data } = await agentApi.get<Envelope<StudentSessions>>(`${student(studentId)}/sessions`)
  return data.data
}

export async function addStudentNote(
  studentId: string,
  sessionId: string,
  body: AddNoteIn,
): Promise<CounselorWriteOut> {
  const { data } = await agentApi.post<Envelope<CounselorWriteOut>>(
    `${student(studentId)}/sessions/${encodeURIComponent(sessionId)}/annotations`,
    body,
  )
  return data.data
}

export async function confirmStudentPaths(
  studentId: string,
  sessionId: string,
  version: number,
): Promise<CounselorWriteOut> {
  const { data } = await agentApi.post<Envelope<CounselorWriteOut>>(
    `${student(studentId)}/sessions/${encodeURIComponent(sessionId)}/confirm-paths`,
    { version },
  )
  return data.data
}
