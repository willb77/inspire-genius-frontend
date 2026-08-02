/**
 * Interview PRACTICE service — candidate-side STAR rehearsal.
 *
 * The candidate-safe counterpart to interview.service.ts. Backed by the
 * agent-engine `GET /v1/agents/interview/practice-questions`, which returns STAR
 * questions + probes ONLY — never the evaluator's scores or exemplars. Coaching
 * feedback is produced by Alex in interview-coach mode over the async-job chat
 * path (driven by the page via useMeridianJob). Reached via `agentApi`.
 */
import { agentApi } from "@/lib/agentApi"

export type PracticeCompetency = {
  id: string
  competency: string
  question: string
  starProbes: string[]
}

export type PracticeSection = {
  key: "vision" | "behavioral" | "productivity"
  section: string
  title: string
  competencies: PracticeCompetency[]
}

export type PracticeQuestions = {
  guidance: string
  sections: PracticeSection[]
  totalCompetencies?: number
}

export const practiceService = {
  async getPracticeQuestions(params?: {
    section?: PracticeSection["key"]
  }): Promise<PracticeQuestions> {
    const { data } = await agentApi.get<PracticeQuestions>(
      "/v1/agents/interview/practice-questions",
      { params: { section: params?.section } },
    )
    return data
  },
}

/**
 * Frame the user's answer so the coaching orchestrator routes it to Alex in
 * interview-coach mode. The leading "Interview practice" phrase matches the
 * orchestrator's practice short-circuit; `alex_mode` is also passed as job
 * context (belt-and-suspenders). No score/exemplar is ever requested or shown.
 */
export function buildCoachMessage(question: string, answer: string): string {
  return (
    `Interview practice — please coach my STAR answer.\n\n` +
    `Question: "${question}"\n\n` +
    `My answer: "${answer}"`
  )
}

export const PRACTICE_JOB_CONTEXT = { alex_mode: "interview_coach" } as const
