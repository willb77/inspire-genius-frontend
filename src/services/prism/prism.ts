/**
 * PRISM survey-request service (G8).
 *
 * Routes through `agentApi` per `.claude/rules/agents.md` §1 — agent-engine
 * endpoints (the `/v1/prism/requests*` family is owned by the agent-engine
 * Aura agent) go through the agentApi axios instance, NOT through the
 * monolith CloudFront proxy.
 *
 * These wrap the NEW G8 endpoints introduced in the monorepo P1 backend
 * change (Agent A) — distinct from the legacy `POST /v1/prism/initiate`
 * surface in `prism.service.ts` which talks to the older monolith path.
 */
import { agentApi } from '@/lib/agentApi'

/** Outbound payload for `POST /v1/prism/requests` */
export type PrismSurveyRequestPayload = {
  forename: string
  surname: string
  email: string
  organisation?: string
  /** PRISM questionnaire type id (Foundation / Personal / Professional). */
  qtype_id?: number
}

/** Lifecycle states the backend can return for a PRISM request */
export type PrismRequestStatusDesc =
  | 'pending'
  | 'sent'
  | 'in_progress'
  | 'completed'
  | 'error'
  | string

/** Response from `POST /v1/prism/requests` */
export type PrismSurveyRequestResponse = {
  request_id: string
  action_url_1: string
  quest_status_desc: PrismRequestStatusDesc
}

/** Single row returned by `GET /v1/prism/requests/me` */
export type PrismRequestRow = {
  request_id: string
  action_url_1: string | null
  quest_status_desc: PrismRequestStatusDesc
  forename: string | null
  surname: string | null
  email: string | null
  organisation: string | null
  qtype_id: number | null
  created_at: string | null
  updated_at: string | null
}

/** Paginated response from `GET /v1/prism/requests/me` */
export type PrismRequestListResponse = {
  items: PrismRequestRow[]
  total: number
  page?: number
  page_size?: number
}

/** `POST /v1/prism/requests` — create a new PRISM survey request */
export async function requestPrismSurvey(
  payload: PrismSurveyRequestPayload,
): Promise<PrismSurveyRequestResponse> {
  const resp = await agentApi.post<PrismSurveyRequestResponse>(
    '/v1/prism/requests',
    payload,
  )
  return resp.data
}

/** `GET /v1/prism/requests/me` — list my PRISM survey requests */
export async function listMyPrismRequests(): Promise<PrismRequestListResponse> {
  const resp = await agentApi.get<PrismRequestListResponse>(
    '/v1/prism/requests/me',
  )
  return resp.data
}
