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
 * The interview seat the candidate is practising for. Collected up-front by the
 * frame form and passed into coaching so Alex tailors questions + feedback to
 * the specific role, reporting line, and scope (and weights flagged risks).
 */
export type InterviewFrame = {
  company: string
  industry: string
  roleTitle: string
  reportingLine: string
  scope: string
  candidateType?: "external" | "internal" | ""
  weightedFocus?: string
  lengthPref?: string
}

export const DEFAULT_LENGTH_PREF = "45–60 minutes across 12 questions (4 vision, 4 behavioral, 4 productivity)"

function frameSummary(f: InterviewFrame): string {
  const lines = [
    `- Company: ${f.company}`,
    `- Industry/sector: ${f.industry}`,
    `- Role title: ${f.roleTitle}`,
    `- Reporting line: ${f.reportingLine}`,
    `- Scope of responsibility: ${f.scope}`,
  ]
  if (f.candidateType) lines.push(`- Candidate type: ${f.candidateType === "internal" ? "internal promotion" : "external candidate"}`)
  if (f.weightedFocus?.trim()) lines.push(`- Weight more heavily: ${f.weightedFocus.trim()}`)
  lines.push(`- Interview length: ${f.lengthPref?.trim() || DEFAULT_LENGTH_PREF}`)
  return lines.join("\n")
}

/**
 * Frame the user's answer so the coaching orchestrator routes it to Alex in
 * interview-coach mode. The leading "Interview practice" phrase matches the
 * orchestrator's practice short-circuit; `alex_mode` + the interview frame are
 * also passed as job context. No score/exemplar is ever requested or shown.
 */
export function buildCoachMessage(question: string, answer: string, frame?: InterviewFrame | null): string {
  const framePreamble = frame
    ? `Interview frame (the seat I'm practising for):\n${frameSummary(frame)}\n\n`
    : ""
  return (
    `Interview practice — please coach my STAR answer.\n\n` +
    framePreamble +
    `Question: "${question}"\n\n` +
    `My answer: "${answer}"`
  )
}

/** Job context for the async-chat coaching call. Includes the frame when set. */
export function practiceJobContext(frame?: InterviewFrame | null): Record<string, unknown> {
  return frame
    ? { alex_mode: "interview_coach", interview_frame: frame }
    : { alex_mode: "interview_coach" }
}

export const PRACTICE_JOB_CONTEXT = { alex_mode: "interview_coach" } as const
