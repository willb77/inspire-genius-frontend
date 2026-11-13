import { agentApi } from "@/lib/agentApi"
import type { AgeStep, MySessions, SessionOut, StartOut } from "@/types/career-exercise/student"

/**
 * CX-5 — the student's own career exercise. Owner-only routes: the server takes
 * the owner from the token, so nothing here sends a person id. Every route
 * refuses itself (403) while the `career_exercise` switch is off for the
 * caller. Agent-engine routes, so `agentApi`, never the monolith instance.
 *
 * There is no client write of the worksheet: the stage outputs are written by
 * the exercise itself as the chat goes, so a pay or education value here can
 * only have come from the server's own occupation data.
 */
const PREFIX = "/v1/agents/career-exercise"
type Envelope<T> = { status: boolean; data: T }

const one = (sessionId: string) => `${PREFIX}/sessions/${encodeURIComponent(sessionId)}`

/** My sessions, newest first. */
export async function getMySessions(): Promise<MySessions> {
  const { data } = await agentApi.get<Envelope<MySessions>>(`${PREFIX}/sessions`)
  return data.data
}

/** Start the exercise, or get back the open session if there is one. */
export async function startMySession(): Promise<StartOut> {
  const { data } = await agentApi.post<Envelope<StartOut>>(`${PREFIX}/sessions`)
  return data.data
}

/** Pause at the version on screen; a stale version is a 409. */
export async function pauseMySession(sessionId: string, version: number): Promise<SessionOut> {
  const { data } = await agentApi.post<Envelope<SessionOut>>(`${one(sessionId)}/pause`, { version })
  return data.data
}

/** Resume at the version on screen; a stale version is a 409. */
export async function resumeMySession(sessionId: string, version: number): Promise<SessionOut> {
  const { data } = await agentApi.post<Envelope<SessionOut>>(`${one(sessionId)}/resume`, { version })
  return data.data
}

/**
 * CX-AGE — should the page ask my birth year? True only when the exercise
 * would turn me away for having no age on file.
 */
export async function getMyAgeStep(): Promise<AgeStep> {
  const { data } = await agentApi.get<Envelope<AgeStep>>(`${PREFIX}/age-step`)
  return data.data
}

/**
 * CX-AGE — my birth year, once. The server keeps only an age band, never the
 * year, and answers with nothing but whether to ask again and where next.
 * 409 when there is already an age on file; 422 for a year that can't be right.
 */
export async function recordMyBirthYear(birthYear: number): Promise<AgeStep> {
  const { data } = await agentApi.post<Envelope<AgeStep>>(`${PREFIX}/age-step`, { birthYear })
  return data.data
}
