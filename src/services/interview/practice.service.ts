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

/**
 * One-time personalization payload for the coach — the signed-in user's OWN
 * profile block (PRISM summary + ambient résumé), fetched ONCE at interview
 * start and replayed into each turn. `enabled` is false when the backend flag
 * (AGENT_ENGINE_INTERVIEW_PRACTICE_PERSONALIZATION) is off; `personalContext`
 * is empty when the user has no PRISM/résumé on file. It is the user's own data,
 * never an evaluator score — the candidate-safe contract is unchanged.
 */
export type PracticeContext = {
  enabled: boolean
  hasPrism: boolean
  hasResume: boolean
  personalContext: string
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

  /**
   * Fetch the caller's own coaching-context block ONCE at interview start. The
   * expensive assembly happens here (cheap SQL, no pgvector) and the result is
   * replayed by the page into every turn's job context — so the per-turn path
   * never pays a retrieval cost.
   */
  async getPracticeContext(): Promise<PracticeContext> {
    const { data } = await agentApi.get<PracticeContext>(
      "/v1/agents/interview/practice-context",
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
  /** How many questions the interview should run (default 12). */
  numQuestions?: number
  /** Target length in minutes (default 50). */
  lengthMinutes?: number
}

export const DEFAULT_NUM_QUESTIONS = 12
export const DEFAULT_LENGTH_MINUTES = 50
export const DEFAULT_LENGTH_PREF = "45–60 minutes across 12 questions (4 vision, 4 behavioral, 4 productivity)"

export function frameQuestionCount(f: InterviewFrame): number {
  const n = Number(f.numQuestions)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_NUM_QUESTIONS
  return Math.min(Math.round(n), 12) // bank has 12 competencies
}

export function frameLengthMinutes(f: InterviewFrame): number {
  const m = Number(f.lengthMinutes)
  if (!Number.isFinite(m) || m < 1) return DEFAULT_LENGTH_MINUTES
  return Math.round(m)
}

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
  lines.push(`- Interview length: ${frameLengthMinutes(f)} minutes across ${frameQuestionCount(f)} questions`)
  return lines.join("\n")
}

/** One planned interview question, positioned in the bounded sequence. */
export type PlannedQuestion = {
  id: string
  competency: string
  question: string
  starProbes: string[]
  sectionKey: PracticeSection["key"]
  sectionTitle: string
  number: number // 1-based position in the interview
}

/**
 * Build a BOUNDED, ordered interview of exactly N questions, distributed across
 * the three sections (vision → behavioral → productivity) as evenly as the
 * count allows. This is what fixes "questions repeat forever": the interview is
 * a fixed list, presented once, then it ends.
 */
export function buildInterviewPlan(bank: PracticeQuestions, frame: InterviewFrame): PlannedQuestion[] {
  const n = frameQuestionCount(frame)
  const order: PracticeSection["key"][] = ["vision", "behavioral", "productivity"]
  const sections = order
    .map((k) => bank.sections.find((s) => s.key === k))
    .filter((s): s is PracticeSection => Boolean(s))

  // Even split with remainder going to the earlier sections.
  const base = Math.floor(n / sections.length)
  const rem = n % sections.length
  const perSection = sections.map((_, i) => base + (i < rem ? 1 : 0))

  const plan: PlannedQuestion[] = []
  sections.forEach((sec, i) => {
    const take = Math.min(perSection[i], sec.competencies.length)
    for (let j = 0; j < take; j++) {
      const c = sec.competencies[j]
      plan.push({
        id: c.id,
        competency: c.competency,
        question: c.question,
        starProbes: c.starProbes,
        sectionKey: sec.key,
        sectionTitle: sec.title,
        number: 0, // assigned below
      })
    }
  })
  // If rounding/caps left us short of N, top up from any remaining competencies.
  if (plan.length < n) {
    const used = new Set(plan.map((p) => p.id))
    for (const sec of sections) {
      for (const c of sec.competencies) {
        if (plan.length >= n) break
        if (used.has(c.id)) continue
        plan.push({
          id: c.id, competency: c.competency, question: c.question,
          starProbes: c.starProbes, sectionKey: sec.key, sectionTitle: sec.title, number: 0,
        })
        used.add(c.id)
      }
    }
  }
  return plan.slice(0, n).map((p, i) => ({ ...p, number: i + 1 }))
}

/** A completed exchange in the interview, for the findings compilation. */
export type InterviewExchange = {
  number: number
  sectionTitle: string
  competency: string
  question: string
  answer: string
}

/**
 * Ask Alex for the end-of-interview FINDINGS — a developmental (self-assessment)
 * read-out, NOT a hiring score. Mirrors the reference format: Key Strengths,
 * Areas to Improve, Recommended Actions, a coverage caveat when the interview
 * was ended early, and a confidence note. Explicitly forbids a numeric score.
 */
export function buildFindingsMessage(
  frame: InterviewFrame,
  exchanges: InterviewExchange[],
): string {
  const planned = frameQuestionCount(frame)
  const transcript = exchanges
    .map((e) => `Q${e.number} [${e.sectionTitle}] — ${e.competency}\nQuestion: ${e.question}\nMy answer: ${e.answer}`)
    .join("\n\n")
  const coverage = exchanges.length < planned
    ? `\n\nNOTE: I ended early — I answered ${exchanges.length} of ${planned} planned questions. Add a brief coverage caveat.`
    : ""
  return (
    `Interview practice — the session is complete. Please give me my end-of-interview FINDINGS as a developmental self-assessment coaching summary.\n\n` +
    `Interview frame:\n${frameSummary(frame)}\n\n` +
    `Structure this as: Key Strengths (Evidenced), Areas to Improve, Recommended Actions, Coverage note, and Confidence in this read. ` +
    `This is practice — DO NOT give a numeric score, a 1–5 rating, or a hiring recommendation. Coach me to get better.${coverage}\n\n` +
    `Here is the full interview (${exchanges.length} answered of ${planned} planned):\n\n${transcript}`
  )
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

/**
 * Job context for the async-chat coaching call. Includes the frame when set, and
 * the one-time `personal_context` blob when personalization is on — the backend
 * (Alex interview-coach mode) folds it into the prompt as grounding. Passed via
 * job context (not the visible message) so a multi-KB profile block never bloats
 * the transcript. Omitted entirely when empty, so the coach degrades to bank +
 * frame only.
 */
export function practiceJobContext(
  frame?: InterviewFrame | null,
  personalContext?: string | null,
): Record<string, unknown> {
  const ctx: Record<string, unknown> = { alex_mode: "interview_coach" }
  if (frame) ctx.interview_frame = frame
  if (personalContext && personalContext.trim()) ctx.personal_context = personalContext
  return ctx
}

export const PRACTICE_JOB_CONTEXT = { alex_mode: "interview_coach" } as const
