import { agentApi } from '@/lib/agentApi'
import type {
  AnalysisPart,
  BatteryResult,
  CharacterRequest,
  GenerateResult,
  Rubric,
  ScoreByType,
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
