import { agentApi } from '@/lib/agentApi'
import type { TeamStudioWire } from './adapt'

/**
 * Team Development Studio API — PRISM narrative about a REAL direct report.
 *
 * Calls `agentApi`, NOT the monolith `api` instance: these routes live on the
 * agent-engine and are only reachable through `/v1/agents/{proxy+}`. Anything
 * mounted outside `/v1/agents/` falls through to the monolith, which has no
 * such route — it passes every unit test, deploys green, and 404s in the
 * browser. The prefix below is load-bearing; do not "tidy" it.
 *
 * Deliberately NOT a parameterisation of the Character Lab service. That
 * service reaches `/v1/agents/character-lab`, which is super-admin territory
 * and operates on invented people. One module that could address either would
 * put a manager surface one argument away from it. Two modules cannot make that
 * mistake, and the duplication is four lines of axios.
 *
 * Unlike Character Lab, nothing here is stored: every call sends the subject
 * with the request. There is no saved-profile id, no library, no scenario
 * store — a real person's PRISM record lives in the PRISM stores, and this
 * surface reads narrative about it rather than keeping its own copy.
 */

const BASE = '/v1/agents/team-studio'

type Envelope<T> = { status: string; data: T }

/**
 * A person as this API wants them: a name, their scores, optionally the
 * quadrant roll-up and any free-text context the manager has recorded.
 *
 * `scores` is scale label → 0–100, and `colours` quadrant name → 0–100. Both
 * are sent as the caller derived them; nothing in this file invents a number.
 */
export type StudioSubject = {
  name: string
  scores: Record<string, number>
  colours?: Record<string, number>
  notes?: string
}

/**
 * One slice of the write-up.
 *
 * Split for the same measured reason as every other narrative endpoint here:
 * a full write-up over 88 scores exceeds API Gateway's 30s integration cap and
 * returns 503. The server owns the section grouping and reports how many parts
 * there are; callers fetch the rest and concatenate in part order.
 */
export async function analyseSubject(req: {
  subject: StudioSubject
  part: number
}): Promise<TeamStudioWire> {
  const { data } = await agentApi.post<Envelope<TeamStudioWire>>(`${BASE}/analyse`, req)
  return data.data
}

/** One section of a comparison across two to four people. Same 30s reason. */
export async function compareSubjects(req: {
  subjects: StudioSubject[]
  part: number
}): Promise<TeamStudioWire> {
  const { data } = await agentApi.post<Envelope<TeamStudioWire>>(`${BASE}/compare`, req)
  return data.data
}

/**
 * `subjects`, plural, on every endpoint that can be asked about a group.
 *
 * The count IS the mode: one subject asks about that person, several ask about
 * them together. That is why there is no `focus` field — a scenario's
 * individual read is a one-element request and its collaborative read is an
 * all-of-them request, so the server never has to be told which it is, and the
 * two cannot disagree.
 *
 * These previously sent `subject` (a list, under a singular key) against a
 * server that wanted a single object, which is a 422 from Pydantic rather than
 * a soft failure — exactly what staging-b returned on 2026-09-03. Sending only
 * the first of several would have been worse than the error: an answer about
 * one person, under a heading naming four.
 */
export async function fetchStarterQuestions(req: {
  subjects: StudioSubject[]
}): Promise<TeamStudioWire> {
  const { data } = await agentApi.post<Envelope<TeamStudioWire>>(`${BASE}/questions`, req)
  return data.data
}

export async function askAboutSubjects(req: {
  subjects: StudioSubject[]
  question: string
}): Promise<TeamStudioWire> {
  const { data } = await agentApi.post<Envelope<TeamStudioWire>>(`${BASE}/ask`, req)
  return data.data
}

/** One person's read of a situation, or the group's. See the note above. */
export async function runScenario(req: {
  subjects: StudioSubject[]
  situation: string
}): Promise<TeamStudioWire> {
  const { data } = await agentApi.post<Envelope<TeamStudioWire>>(`${BASE}/scenario`, req)
  return data.data
}

export async function exportSubject(req: {
  subject: StudioSubject
  fmt: 'wide' | 'long'
}): Promise<{ filename: string; content: string }> {
  const { data } = await agentApi.post<Envelope<{ filename: string; content: string }>>(
    `${BASE}/export`,
    req,
  )
  return data.data
}
