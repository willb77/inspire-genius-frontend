/**
 * Browser-local persistence for the Survey surface.
 *
 * Surveys and responses live in `localStorage` under versioned keys. This keeps
 * the whole surface shippable and self-contained (no backend dependency) while
 * mirroring the CRUD shape a future survey-service would expose, so swapping the
 * store for API calls is a one-file change.
 *
 * All reads/writes are wrapped in try/catch: a disabled or full `localStorage`
 * degrades to an in-memory-empty view rather than throwing into React render.
 */
import type {
  Survey,
  SurveyAnswerValue,
  SurveyQuestion,
  SurveyResponse,
} from "@/types/survey"

const SURVEYS_KEY = "ig.surveys.v1"
const RESPONSES_KEY = "ig.surveyResponses.v1"
const SEED_FLAG_KEY = "ig.surveys.seeded.v1"

/** Prefer a real UUID; fall back to a time+random id where crypto is absent. */
export function newId(prefix: string): string {
  try {
    const c = (globalThis as { crypto?: Crypto }).crypto
    if (c && typeof c.randomUUID === "function") {
      return `${prefix}_${c.randomUUID()}`
    }
  } catch {
    /* fall through */
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable — no-op */
  }
}

/* ------------------------------------------------------------------ seed --- */

/** Two example surveys so the selector is never blank on first visit. */
function seedSurveys(): Survey[] {
  const ts = nowIso()
  return [
    {
      id: "seed_team_pulse",
      title: "Team Pulse Check",
      description:
        "A short weekly check-in on workload, morale, and blockers.",
      createdAt: ts,
      updatedAt: ts,
      questions: [
        {
          id: "q_pulse_1",
          prompt: "How manageable was your workload this week?",
          type: "rating",
          scaleMax: 5,
          required: true,
        },
        {
          id: "q_pulse_2",
          prompt: "Which areas felt like blockers?",
          type: "multi",
          options: [
            "Unclear priorities",
            "Waiting on others",
            "Tooling / access",
            "Too many meetings",
            "None",
          ],
        },
        {
          id: "q_pulse_3",
          prompt: "Anything you'd like your manager to know?",
          type: "text",
        },
      ],
    },
    {
      id: "seed_coaching_intake",
      title: "Coaching Intake",
      description: "Helps your coach tailor the first session.",
      createdAt: ts,
      updatedAt: ts,
      questions: [
        {
          id: "q_intake_1",
          prompt: "What's the main thing you want to work on?",
          type: "single",
          options: [
            "Leadership presence",
            "Communication",
            "Career direction",
            "Work-life balance",
            "Something else",
          ],
          required: true,
        },
        {
          id: "q_intake_2",
          prompt: "How ready do you feel to make a change right now?",
          type: "rating",
          scaleMax: 5,
        },
        {
          id: "q_intake_3",
          prompt: "Briefly, what does success look like in 90 days?",
          type: "text",
        },
      ],
    },
  ]
}

/**
 * Seed the example surveys exactly once per browser (guarded by a flag so a
 * user who deletes the samples doesn't get them back on the next load).
 */
export function ensureSeeded(): void {
  try {
    if (globalThis.localStorage?.getItem(SEED_FLAG_KEY)) return
    const existing = readJson<Survey[]>(SURVEYS_KEY, [])
    if (existing.length === 0) {
      writeJson(SURVEYS_KEY, seedSurveys())
    }
    globalThis.localStorage?.setItem(SEED_FLAG_KEY, "1")
  } catch {
    /* no-op */
  }
}

/* --------------------------------------------------------------- surveys --- */

export function listSurveys(): Survey[] {
  ensureSeeded()
  const surveys = readJson<Survey[]>(SURVEYS_KEY, [])
  // Newest first.
  return [...surveys].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function getSurvey(id: string): Survey | undefined {
  return listSurveys().find((s) => s.id === id)
}

/** Upsert a survey by id, stamping `updatedAt`. Returns the stored record. */
export function saveSurvey(survey: Survey): Survey {
  const all = readJson<Survey[]>(SURVEYS_KEY, [])
  const stamped: Survey = { ...survey, updatedAt: nowIso() }
  const idx = all.findIndex((s) => s.id === survey.id)
  if (idx >= 0) {
    all[idx] = stamped
  } else {
    all.push(stamped)
  }
  writeJson(SURVEYS_KEY, all)
  return stamped
}

export function deleteSurvey(id: string): void {
  const all = readJson<Survey[]>(SURVEYS_KEY, [])
  writeJson(
    SURVEYS_KEY,
    all.filter((s) => s.id !== id),
  )
}

/** Build a fresh, empty survey (not yet persisted). */
export function createDraftSurvey(): Survey {
  const ts = nowIso()
  return {
    id: newId("survey"),
    title: "",
    description: "",
    questions: [],
    createdAt: ts,
    updatedAt: ts,
  }
}

/** Build a fresh, empty question of the given type. */
export function createDraftQuestion(
  type: SurveyQuestion["type"] = "text",
): SurveyQuestion {
  const base: SurveyQuestion = { id: newId("q"), prompt: "", type }
  if (type === "single" || type === "multi") base.options = ["", ""]
  if (type === "rating") base.scaleMax = 5
  return base
}

/* ------------------------------------------------------------- responses --- */

export function listResponses(surveyId?: string): SurveyResponse[] {
  const all = readJson<SurveyResponse[]>(RESPONSES_KEY, [])
  const filtered = surveyId ? all.filter((r) => r.surveyId === surveyId) : all
  return [...filtered].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt),
  )
}

export function saveResponse(
  surveyId: string,
  answers: Record<string, SurveyAnswerValue>,
): SurveyResponse {
  const all = readJson<SurveyResponse[]>(RESPONSES_KEY, [])
  const record: SurveyResponse = {
    id: newId("resp"),
    surveyId,
    answers,
    submittedAt: nowIso(),
  }
  all.push(record)
  writeJson(RESPONSES_KEY, all)
  return record
}

export function countResponses(surveyId: string): number {
  return listResponses(surveyId).length
}
