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

/** Outbound payload for `POST /v1/prism/requests`.
 *
 *  Mirrors the backend `CreateRequestBody` model. Optional fields fall back
 *  to the backend defaults when omitted (`qtype_id` 4 = Foundation,
 *  `lang_id` 25 = US English, `gender` false, `isGift` false). */
export type PrismSurveyRequestPayload = {
  forename: string
  surname: string
  email: string
  organisation?: string
  /** PRISM questionnaire type id (Foundation / Personal / Professional). */
  qtype_id?: number
  /** PRISM language id — 25 = US English (backend default). */
  lang_id?: number
  /** PRISM convention: `true` = male, `false` = female. */
  gender?: boolean
  /** Auto-marks the request as pre-paid so the report unlocks immediately.
   *  Sent camelCase — the backend model aliases it to `is_gift`. */
  isGift?: boolean
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

/** Lifecycle states for the G9 ingest pipeline (CSV → assessments). */
export type PrismIngestStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'error'
  | string

/** Single row returned by `GET /v1/prism/requests/me`.
 *
 *  G9 P2 (poll + ingest) extends this row with `ingest_status`,
 *  `completed_at` and `requested_at`. These are optional + nullable so the
 *  type stays compatible with pre-G9 backend payloads.
 *
 *  The row's S3 keys are intentionally absent — see the note on the fields
 *  below. */
export type PrismRequestRow = {
  /** Backend field is `id` (RequestRow.id), NOT `request_id` — that name
   *  belongs to the POST response (`CreateRequestResponse`). */
  id: string
  action_url_1: string | null
  /** PRISM leaves ActionURL1 empty for a freshly-created candidate and puts
   *  the questionnaire link in ActionURL2, so BOTH must be read. */
  action_url_2: string | null
  forename: string | null
  surname: string | null
  email: string | null
  organisation: string | null
  qtype_id: number | null
  // ── Not returned by GET /v1/prism/requests/me ───────────
  // Kept optional because the POST response and future revisions carry
  // them; reading them off a list row will simply yield undefined.
  quest_status_desc?: PrismRequestStatusDesc
  created_at?: string | null
  updated_at?: string | null
  // ── G9 P2 ingest pipeline fields ────────────────────────
  /** Lifecycle of the CSV → assessments ingest job. */
  ingest_status?: PrismIngestStatus | null
  /** ISO-8601 timestamp when the survey was completed. */
  completed_at?: string | null
  // NOTE: `csv_s3_key` / `pdf_s3_key` are deliberately NOT declared here.
  // They exist on the prism_requests row but are internal S3 object keys
  // (bucket layout + user id) that GET /v1/prism/requests/me does not return
  // and should not — declaring them created a false expectation that fed a
  // tooltip branch which could never render.
  /** ISO-8601 timestamp when the survey was requested.
   *  Distinct from `created_at` because P2 stamps this when the
   *  questionnaire link is opened by the user. */
  requested_at?: string | null
}

/** Paginated response from `GET /v1/prism/requests/me`.
 *
 *  The backend key is `rows` (`RequestListResponse.rows`). This type said
 *  `items` and nothing ever matched, so `useLatestPrismStatus()` always saw
 *  an empty list and the "PRISM ready" badge could never render. */
export type PrismRequestListResponse = {
  rows: PrismRequestRow[]
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
