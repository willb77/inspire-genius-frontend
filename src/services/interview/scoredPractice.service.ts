/**
 * Scored Interview Practice — 3.4 Phase 4. Reached via `agentApi`, like the
 * rest of practice. Every route here is dark until the tier's
 * `practice_scored` switch is on; `usePracticeScoredEnabled` is how the page
 * knows, and it is NOT a security check (each route enforces the switch).
 */
import { agentApi } from "@/lib/agentApi"

const BASE = "/v1/agents/interview/practice"

export type ScoredPracticeItem = { id: string; question: string }

export type ScoredPracticeAnswer = {
  answer_id: string
  score: number | null
  final_source: string | null
  notice: string
}

export type ScoredPracticeResult = {
  session_id: string
  overall_score: number
  overall_mean: number
  /** An alignment band ("strong-alignment" … "limited-alignment"), never a
   *  hiring instruction. */
  recommendation: string
  section_scores: Record<string, { mean: number; weight: number; weighted: number }>
  answers: { competency_id: string; question_text: string; score: number | null }[]
  answered: number
  notice: string
}

export async function createScoredPractice(body: {
  items: ScoredPracticeItem[]
  roleTitle?: string
  company?: string
  industry?: string
  goalId?: string
}): Promise<{ session_id: string; notice: string }> {
  const { data } = await agentApi.post(`${BASE}/session`, body)
  return data
}

export async function postScoredPracticeAnswer(
  sessionId: string,
  competencyId: string,
  capturedAnswer: string,
): Promise<ScoredPracticeAnswer> {
  const { data } = await agentApi.post<ScoredPracticeAnswer>(`${BASE}/session/${sessionId}/answer`, {
    competency_id: competencyId,
    captured_answer: capturedAnswer,
  })
  return data
}

export async function finalizeScoredPractice(sessionId: string): Promise<ScoredPracticeResult> {
  const { data } = await agentApi.post<ScoredPracticeResult>(`${BASE}/session/${sessionId}/finalize`)
  return data
}
