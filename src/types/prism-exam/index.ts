/**
 * PRISM Practitioner Exam — types mirroring the agent-engine's
 * `/v1/agents/prism-exam` routes (`app/routes/prism_exam.py`).
 *
 * A run asks every question in a question set of Meridian, as the synthetic
 * exam user, judges each answer against the set's expected answers and keeps
 * the lot: runs are history, answers are the evidence.
 *
 * Super-admins see every set and run. A granted user (manager or above, with a
 * grant) sees their own sets plus shared ones, and only their own runs.
 */

export type ExamVerdict = "correct" | "partial" | "wrong"

export type RunStatus = "queued" | "running" | "complete" | "cancelled" | "error"

export const ACTIVE_RUN_STATUSES: readonly RunStatus[] = ["queued", "running"]

export const VERDICT_SCORE: Record<ExamVerdict, number> = { correct: 1, partial: 0.5, wrong: 0 }

export type ChapterSummary = {
  title: string
  n: number
  correct: number
  partial: number
  wrong: number
  /** 0..1 */
  score: number
}

export type RunAgents = {
  by_agent: Record<string, number>
  /** Answers where a non-Aura agent consulted Aura before answering. */
  aura_consults: number
}

export type ExamRun = {
  id: string
  tier: string
  label: string | null
  question_set_id: string
  question_set_version?: number | null
  question_set_name?: string | null
  status: RunStatus
  started_by: string
  exam_user_id: string
  concurrency: number
  engine_sha: string | null
  judge_model: string | null
  total: number
  done: number
  /** 0..1, null until the run finalises. */
  score: number | null
  by_chapter: Record<string, ChapterSummary> | null
  agents: RunAgents | null
  error: string | null
  created_at: string
  started_at: string | null
  heartbeat_at: string | null
  completed_at: string | null
}

/** `GET /runs/{id}` adds the pass mark and the verdict against it. */
export type ExamRunDetail = ExamRun & {
  pass_mark: number
  passed: boolean
}

export type ExamAnswer = {
  id: string
  run_id: string
  question_id: string
  chapter: string
  page: number | null
  question: string
  expected: string
  answer: string | null
  agent: string | null
  contributing_agents: string[] | null
  rag_sources: unknown[] | null
  verdict: ExamVerdict | null
  missing: string[] | null
  reason: string | null
  elapsed_s: number | null
  session_id: string | null
  error: string | null
  created_at: string
}

export type ExamQuestion = {
  id: string
  chapter: string
  page: number | null
  q: string
  expected: string
  /** Where the expected answer comes from, e.g. a script section; imported sets carry it. */
  basis?: string | null
  confidence?: string | null
}

export type QuestionSetSummary = {
  id: string
  version: number
  name: string
  count?: number
  pass_mark: number
  is_active: boolean
  created_by?: string | null
  created_at?: string | null
  owner_user_id?: string | null
  /** Visible to every granted user; only a super-admin can share. */
  shared?: boolean
}

export type QuestionSet = QuestionSetSummary & {
  questions: ExamQuestion[]
  chapters: Record<string, string>
}

export type QuestionSetInput = {
  name: string
  pass_mark: number
  chapters: Record<string, string>
  questions: ExamQuestion[]
}

export type StartRunInput = {
  question_set_id?: string
  label?: string
  concurrency?: number
}

export type StartRunResult = {
  run_id: string
  status: RunStatus
  total: number
}

export type DiffRecord = {
  question_id: string
  chapter: string | null
  question: string | null
  before: ExamVerdict | null
  after: ExamVerdict | null
  agent_before: string | null
  agent_after: string | null
}

export type DiffChapter = {
  chapter: string
  title: string
  before: number | null
  after: number | null
  delta: number | null
}

export type RunRef = {
  id: string
  label: string | null
  score: number | null
  engine_sha: string | null
  created_at: string
}

export type RunDiff = {
  improved: DiffRecord[]
  regressed: DiffRecord[]
  unchanged_count: number
  routing_changes: DiffRecord[]
  by_chapter: DiffChapter[]
  run_a: RunRef
  run_b: RunRef
}

/** `GET /access` — what the page may show the caller. */
export type ExamAccess = {
  allowed: boolean
  super_admin: boolean
  /** null for a super-admin (not capped). */
  daily_cap: number | null
  runs_last_24h: number
}

export type NamedQuestionSetInput = QuestionSetInput & { shared?: boolean }

export type ImportSkip = { id: string; reason: string }

/** `POST /question-sets/import` — the preview, plus the saved set when not a dry run. */
export type ImportResult = {
  dry_run: boolean
  count: number
  multiple_choice: number
  chapters: Record<string, string>
  skipped: ImportSkip[]
  warnings: string[]
  sample: ExamQuestion[]
  question_set?: QuestionSetSummary
}

export type ImportInput = {
  file: File
  name?: string
  passMark?: number
  dryRun: boolean
}

export type ExamGrant = {
  user_id: string
  email: string | null
  granted_by: string
  granted_at: string
}

export type AnswerFilters = {
  verdict?: ExamVerdict
  chapter?: string
}
