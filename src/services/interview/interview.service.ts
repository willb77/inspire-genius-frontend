/**
 * Interview service — Maven (InterviewAgent) STAR question bank.
 *
 * Backed by the agent-engine `GET /v1/agents/interview/question-bank`, which
 * serves the shared STAR bank (the same content that feeds Maven's evaluation
 * prompt and James's candidate-guide generation). Reached via `agentApi` — the
 * Agent Engine instance, not the monolith proxy.
 */
import { agentApi } from "@/lib/agentApi"

export type StarExemplars = {
  strong: string
  baseline: string
  weak: string
}

export type StarCompetency = {
  id: string
  competency: string
  question: string
  starProbes: string[]
  exemplars?: StarExemplars
}

export type StarSection = {
  key: "vision" | "behavioral" | "productivity"
  section: string
  title: string
  competencies: StarCompetency[]
}

export type QuestionBank = {
  rubric: Record<string, string>
  guidance: string
  sections: StarSection[]
  totalCompetencies?: number
}

export const interviewService = {
  async getQuestionBank(params?: {
    section?: StarSection["key"]
    includeExemplars?: boolean
  }): Promise<QuestionBank> {
    const { data } = await agentApi.get<QuestionBank>(
      "/v1/agents/interview/question-bank",
      {
        params: {
          section: params?.section,
          include_exemplars: params?.includeExemplars ?? true,
        },
      },
    )
    return data
  },
}
