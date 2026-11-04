/**
 * Intake service — raw Axios calls to `/v1/intake/admin/*` (super-admin only).
 *
 * Uses the `api` instance (API Gateway → intake-service Lambda), NOT
 * `agentApi`, the same as client-signup: intake-service is a microservice
 * behind the shared HTTP API, not the agent engine. Returns the raw JSON the
 * service emits — no `BaseApiResponse<T>` envelope.
 *
 * No React here, per the Service → Hook → Component rule.
 */
import { api } from "@/lib/axios"
import type {
  AttendanceInput,
  Registrant,
  RegistrantDetail,
  RegistrationFilters,
  RegistrationPage,
  SessionList,
  Webinar,
  WebinarInput,
  WebinarList,
} from "@/types/intake"

const BASE = "/v1/intake/admin"
const webinarUrl = (id: string) => `${BASE}/webinars/${encodeURIComponent(id)}`

/** The most rows the server returns per page; the export pages through at this size. */
export const PAGE_MAX = 200
/** Export stops here rather than paging for ever if the total keeps moving. */
export const EXPORT_MAX_ROWS = 10_000

/**
 * Query string for the list. Built by hand because FastAPI reads a repeated
 * `role=a&role=b`, while axios's default serialiser would send `role[]=a`.
 */
export function registrationParams(filters: RegistrationFilters, limit: number, offset: number): URLSearchParams {
  const p = new URLSearchParams()
  if (filters.segment_status) p.set("segment_status", filters.segment_status)
  if (filters.segment_context) p.set("segment_context", filters.segment_context)
  for (const role of filters.role ?? []) p.append("role", role)
  if (filters.needs_review !== undefined) p.set("needs_review", String(filters.needs_review))
  if (filters.created_from) p.set("created_from", filters.created_from)
  if (filters.created_to) p.set("created_to", filters.created_to)
  if (filters.q?.trim()) p.set("q", filters.q.trim())
  p.set("limit", String(limit))
  p.set("offset", String(offset))
  return p
}

export async function listRegistrations(
  filters: RegistrationFilters,
  limit = 50,
  offset = 0,
): Promise<RegistrationPage> {
  const { data } = await api.get<RegistrationPage>(`${BASE}/registrations`, {
    params: registrationParams(filters, limit, offset),
  })
  return data
}

/** Every registration matching `filters`, paged at {@link PAGE_MAX}; for the CSV export. */
export async function listAllRegistrations(filters: RegistrationFilters): Promise<Registrant[]> {
  const out: Registrant[] = []
  for (let offset = 0; offset < EXPORT_MAX_ROWS; offset += PAGE_MAX) {
    const page = await listRegistrations(filters, PAGE_MAX, offset)
    out.push(...page.items)
    if (page.items.length < PAGE_MAX || out.length >= page.total) break
  }
  return out
}

export async function getRegistration(id: string): Promise<RegistrantDetail> {
  const { data } = await api.get<RegistrantDetail>(`${BASE}/registrations/${encodeURIComponent(id)}`)
  return data
}

export async function listWebinars(): Promise<WebinarList> {
  const { data } = await api.get<WebinarList>(`${BASE}/webinars`)
  return data
}

export async function createWebinar(input: WebinarInput): Promise<Webinar> {
  const { data } = await api.post<Webinar>(`${BASE}/webinars`, input)
  return data
}

/** Partial: only the fields sent are changed. */
export async function updateWebinar({ id, ...input }: Partial<WebinarInput> & { id: string }): Promise<Webinar> {
  const { data } = await api.patch<Webinar>(webinarUrl(id), input)
  return data
}

export async function cancelWebinar(id: string): Promise<Webinar> {
  const { data } = await api.post<Webinar>(`${webinarUrl(id)}/cancel`)
  return data
}

export async function getSessionList(id: string): Promise<SessionList> {
  const { data } = await api.get<SessionList>(`${webinarUrl(id)}/registrations`)
  return data
}

export async function markAttendance({
  webinarId,
  registrationIds,
  status,
}: AttendanceInput): Promise<{ updated: number; status: string }> {
  const { data } = await api.post<{ updated: number; status: string }>(`${webinarUrl(webinarId)}/attendance`, {
    registration_ids: registrationIds,
    status,
  })
  return data
}

/** The session's list as the server's CSV (formula cells already defused there). */
export async function downloadSessionCsv(id: string): Promise<Blob> {
  const { data } = await api.get<Blob>(`${webinarUrl(id)}/registrations.csv`, { responseType: "blob" })
  return data
}
