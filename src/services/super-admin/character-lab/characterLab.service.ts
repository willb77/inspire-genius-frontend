import { agentApi } from '@/lib/agentApi'
import type {
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
  req: CharacterRequest & { group: string; behaviours: Record<string, ScoreByType> },
): Promise<BatteryResult> {
  const { data } = await agentApi.post<Envelope<BatteryResult>>(`${BASE}/battery`, req)
  return data.data
}

export async function analyseProfile(
  req: CharacterRequest & {
    scores: Record<string, ScoreByType>
    colours: Record<string, number>
  },
): Promise<string> {
  const { data } = await agentApi.post<Envelope<{ analysis: string }>>(`${BASE}/analyse`, req)
  return data.data.analysis
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
