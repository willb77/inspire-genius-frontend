import { agentApi } from '@/lib/agentApi'
import type {
  AnalysisPart,
  AskResult,
  BatteryResult,
  CharacterRequest,
  ComparisonPart,
  GenerateResult,
  ProfilePatch,
  ProfileSummary,
  Rubric,
  SavedProfile,
  SavedScenario,
  ScenarioPart,
  ScoreByType,
  StarterQuestions,
} from '@/types/character-lab'

/**
 * Character Lab API.
 *
 * Calls `agentApi`, NOT the monolith `api` instance — these routes live on the
 * agent-engine and are reached through `/v1/agents/{proxy+}`. Using `api` would
 * send them to the monolith, which has no such route.
 */

const BASE = '/v1/agents/character-lab'

type Envelope<T> = { status: boolean; data: T }

export async function fetchRubric(): Promise<Rubric> {
  const { data } = await agentApi.get<Envelope<Rubric>>(`${BASE}/rubric`)
  return data.data
}

export async function generateProfile(req: CharacterRequest): Promise<GenerateResult> {
  const { data } = await agentApi.post<Envelope<GenerateResult>>(`${BASE}/generate`, req)
  return data.data
}

export async function scoreBattery(
  req: CharacterRequest & {
    group: string
    behaviours: Record<string, ScoreByType>
    /** Slice index; groups larger than the server's chunk size need several. */
    part?: number
  },
): Promise<BatteryResult> {
  const { data } = await agentApi.post<Envelope<BatteryResult>>(`${BASE}/battery`, req)
  return data.data
}

/**
 * One slice of the write-up.
 *
 * The analysis is split because seven sections of prose over 88 scores exceeded
 * API Gateway's 30s cap and returned 503. The server owns the section grouping
 * and reports how many parts there are; callers concatenate in part order.
 */
export async function analyseProfile(
  req: CharacterRequest & {
    scores: Record<string, ScoreByType>
    colours: Record<string, number>
    part?: number
  },
): Promise<AnalysisPart> {
  const { data } = await agentApi.post<Envelope<AnalysisPart>>(`${BASE}/analyse`, req)
  return data.data
}

export async function exportProfile(
  req: CharacterRequest & {
    scores: Record<string, ScoreByType>
    colours: Record<string, number>
    fmt: 'wide' | 'long'
  },
): Promise<{ filename: string; content: string }> {
  const { data } = await agentApi.post<Envelope<{ filename: string; content: string }>>(
    `${BASE}/export`,
    req,
  )
  return data.data
}

// ─── Saved profiles ─────────────────────────────────────────────────────

export async function listProfiles(): Promise<ProfileSummary[]> {
  const { data } = await agentApi.get<Envelope<{ profiles: ProfileSummary[] }>>(`${BASE}/profiles`)
  return data.data.profiles
}

export async function getProfile(id: string): Promise<SavedProfile> {
  const { data } = await agentApi.get<Envelope<SavedProfile>>(`${BASE}/profiles/${id}`)
  return data.data
}

/**
 * Save a profile, or update the one already saved under that name.
 *
 * Upsert-by-name is the server's contract, not a convenience here: rebuilding a
 * character after editing its notes means "this is the better version", and two
 * identical names in the recall list is a bug the operator can see.
 */
export async function saveProfile(
  req: CharacterRequest & {
    scores: Record<string, ScoreByType>
    colours: Record<string, number>
    reading?: string
    analysis?: string
    evidence?: Record<string, string>
  },
): Promise<SavedProfile> {
  const { data } = await agentApi.post<Envelope<SavedProfile>>(`${BASE}/profiles`, req)
  return data.data
}

/** Patch only the fields supplied — an absent field is left alone, not blanked. */
export async function patchProfile(id: string, patch: ProfilePatch): Promise<SavedProfile> {
  const { data } = await agentApi.patch<Envelope<SavedProfile>>(`${BASE}/profiles/${id}`, patch)
  return data.data
}

export async function deleteProfile(id: string): Promise<void> {
  await agentApi.delete(`${BASE}/profiles/${id}`)
}

// ─── Comparison, questions, scenarios ───────────────────────────────────

/**
 * One section of a comparison across two to four saved characters.
 *
 * Split for the same measured reason as the write-up: the constraint is how
 * much prose comes back, against a 30s gateway cap that cannot be raised.
 */
export async function compareProfiles(req: {
  profile_ids: string[]
  part?: number
}): Promise<ComparisonPart> {
  const { data } = await agentApi.post<Envelope<ComparisonPart>>(`${BASE}/compare`, req)
  return data.data
}

export async function fetchStarterQuestions(req: {
  profile_ids: string[]
}): Promise<StarterQuestions> {
  const { data } = await agentApi.post<Envelope<StarterQuestions>>(`${BASE}/questions`, req)
  return data.data
}

export async function askAboutProfiles(req: {
  profile_ids: string[]
  question: string
}): Promise<AskResult> {
  const { data } = await agentApi.post<Envelope<AskResult>>(`${BASE}/ask`, req)
  return data.data
}

/** One focus per call — a profile id, or `COLLABORATIVE`. */
export async function runScenario(req: {
  profile_ids: string[]
  situation: string
  focus: string
}): Promise<ScenarioPart> {
  const { data } = await agentApi.post<Envelope<ScenarioPart>>(`${BASE}/scenario`, req)
  return data.data
}

export async function listScenarios(): Promise<SavedScenario[]> {
  const { data } = await agentApi.get<Envelope<{ scenarios: SavedScenario[] }>>(`${BASE}/scenarios`)
  return data.data.scenarios
}

export async function saveScenario(req: {
  profile_ids: string[]
  title: string
  situation: string
  character_names: string[]
  result: { individual?: Record<string, string>; collaborative?: string }
}): Promise<SavedScenario> {
  const { data } = await agentApi.post<Envelope<SavedScenario>>(`${BASE}/scenarios`, req)
  return data.data
}

export async function deleteScenario(id: string): Promise<void> {
  await agentApi.delete(`${BASE}/scenarios/${id}`)
}
