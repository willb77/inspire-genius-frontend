// Practitioner client-management service.
//
// Flag-gated: when `VITE_COACH_BACKEND === "true"` (set for the dev build only)
// the exports call the real coach API at `/v1/agents/coach/*` via `agentApi`
// (direct-to-ECS). Otherwise they return the typed fixtures below — the
// wireframe stubs — so environments without the backend (e.g. staging-b, until
// the coach service is promoted there) keep a fully clickable surface. The
// pages and hooks consume the same typed Promises either way.

import { agentApi } from "@/lib/agentApi"
import {
  initiateUpload,
  uploadToS3,
  triggerProcessing,
} from "@/services/documents/documentService"
import {
  CLIENT_RESOURCES,
  type ClientSummary,
  type ClientDetail,
  type PrismStatus,
  type ResourceKey,
  type ScheduleEntry,
  type BulkScheduleInput,
  type BulkScheduleResult,
  type CreditsSummary,
  type ClientUsageRow,
} from "@/types/practitioner/coachClient"

/** True only where the real coach backend is deployed (dev build). */
const USE_COACH_BACKEND = import.meta.env.VITE_COACH_BACKEND === "true"

// ── backend response shapes + mappers ────────────────────────────────
type Envelope<T> = { status?: boolean; data?: T }

type BeClient = {
  client_id: string
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  org?: string | null
  assessment_status?: string | null
  background?: string | null
  target?: string | null
  cohort?: string | null
  linked_user_sub?: string | null
}
type BeArtifacts = {
  clientId: string
  /** Resources the backend actually looked for: key -> present. */
  checked: Record<string, boolean>
  /** Resources it could not answer under this scope — render as NOT CHECKED. */
  unchecked: string[]
  items: { resource: string; documentId: string; filename?: string | null }[]
}
type BeSession = {
  session_id: string
  client_id: string
  starts_at: string
  duration_min: number
  topic?: string | null
}
type BeUsage = { clientId: string; name?: string; sessions?: number; creditsUsed?: number }
type BeCredits = { balance?: number; allocated?: number; used?: number }

function fullName(first?: string | null, last?: string | null, email?: string | null): string {
  const n = [first, last].filter(Boolean).join(" ").trim()
  return n || email || "Client"
}

function prismStatusFrom(status?: string | null): PrismStatus {
  if (status === "ready") return "ready"
  if (status === "in_progress" || status === "processing") return "in_progress"
  return "none"
}

function toSummary(c: BeClient): ClientSummary {
  return {
    id: c.client_id,
    name: fullName(c.first_name, c.last_name, c.email),
    email: c.email ?? "",
    org: c.org ?? "",
    sessions: 0,
    prismScore: null,
    prismStatus: prismStatusFrom(c.assessment_status),
    topGoals: [],
    resourcesPresent: 0,
    status: "new",
  }
}

function emptyResources(): Record<ResourceKey, boolean> {
  const out = {} as Record<ResourceKey, boolean>
  CLIENT_RESOURCES.forEach((r) => {
    out[r.key] = false
  })
  return out
}

function toDetail(c: BeClient): ClientDetail {
  return {
    ...toSummary(c),
    sessionsList: [],
    goals: [],
    prismScores: [],
    conversations: [],
    resources: emptyResources(),
    // Until the artefact fetch resolves, NOTHING has been checked. Defaulting
    // this to [] would mean "we looked and found nothing", which is the lie.
    resourcesUnchecked: CLIENT_RESOURCES.map((r) => r.key),
    followUps: [],
    topics: [],
  }
}

function toScheduleEntry(s: BeSession): ScheduleEntry {
  return {
    id: s.session_id,
    clientName: s.client_id,
    startsAt: s.starts_at,
    durationMin: s.duration_min,
    topic: s.topic ?? "",
  }
}

// ── fixtures (flag-off fallback — keep in sync with the real shapes) ──
const ROSTER: ClientSummary[] = [
  { id: "cl-1", name: "Marcus Chen", email: "marcus@techcorp.com", org: "TechCorp Inc", sessions: 12, prismScore: 82, prismStatus: "ready", topGoals: ["Delegation", "Executive presence"], resourcesPresent: 7, status: "active" },
  { id: "cl-2", name: "Aisha Patel", email: "aisha@globalhealth.com", org: "GlobalHealth", sessions: 8, prismScore: 78, prismStatus: "ready", topGoals: ["Career transition"], resourcesPresent: 5, status: "active" },
  { id: "cl-3", name: "James Morrison", email: "james@finova.com", org: "Finova Group", sessions: 15, prismScore: 85, prismStatus: "ready", topGoals: ["Leadership", "Team building"], resourcesPresent: 9, status: "active" },
  { id: "cl-4", name: "Sophie Laurent", email: "sophie@creativeedge.com", org: "CreativeEdge", sessions: 20, prismScore: 91, prismStatus: "ready", topGoals: ["Executive coaching"], resourcesPresent: 10, status: "active" },
  { id: "cl-5", name: "David Kimura", email: "david@dataprime.com", org: "DataPrime", sessions: 6, prismScore: null, prismStatus: "in_progress", topGoals: ["Onboarding"], resourcesPresent: 3, status: "new" },
  { id: "cl-6", name: "Emma Watson", email: "emma@mediaflow.com", org: "MediaFlow", sessions: 18, prismScore: 88, prismStatus: "ready", topGoals: ["Team dynamics"], resourcesPresent: 8, status: "active" },
  { id: "cl-7", name: "Ryan Park", email: "ryan@buildright.com", org: "BuildRight", sessions: 4, prismScore: null, prismStatus: "none", topGoals: ["Initial assessment"], resourcesPresent: 1, status: "new" },
  { id: "cl-8", name: "Lisa Fernandez", email: "lisa@edunext.com", org: "EduNext", sessions: 14, prismScore: 87, prismStatus: "ready", topGoals: ["Goal-setting"], resourcesPresent: 6, status: "active" },
]

function resourcesFor(present: number): Record<ResourceKey, boolean> {
  const out = {} as Record<ResourceKey, boolean>
  CLIENT_RESOURCES.forEach((r, i) => {
    out[r.key] = i < present
  })
  return out
}

const SCHEDULE: ScheduleEntry[] = [
  { id: "sch-1", clientName: "Marcus Chen", startsAt: "2026-07-23T15:00:00", durationMin: 60, topic: "Delegation deep-dive" },
  { id: "sch-2", clientName: "Sophie Laurent", startsAt: "2026-07-24T17:00:00", durationMin: 45, topic: "Executive presence" },
]

// ── public API (branches on the flag) ────────────────────────────────
export function listClients(): Promise<ClientSummary[]> {
  if (USE_COACH_BACKEND) {
    return agentApi
      .get<Envelope<BeClient[]>>("/v1/agents/coach/clients")
      .then((r) => (r.data?.data ?? []).map(toSummary))
  }
  return Promise.resolve(ROSTER)
}

export function getClient(id: string): Promise<ClientDetail | null> {
  if (USE_COACH_BACKEND) {
    return agentApi
      .get<Envelope<BeClient>>(`/v1/agents/coach/clients/${id}`)
      .then(async (r) => {
        if (!r.data?.data) return null
        const detail = toDetail(r.data.data)
        // Artefacts are fetched separately and folded in. Before this, `resources`
        // came from `emptyResources()` — every box `false` — so every client
        // rendered as "nothing on file" whether or not anything had been uploaded.
        const art = await getClientArtifacts(id)
        if (!art) return detail
        const resources = { ...detail.resources }
        Object.entries(art.checked).forEach(([k, v]) => {
          if (k in resources) resources[k as ResourceKey] = v
        })
        return {
          ...detail,
          resources,
          resourcesUnchecked: (art.unchecked ?? []) as ResourceKey[],
          resourcesPresent: Object.values(art.checked).filter(Boolean).length,
        }
      })
      .catch(() => null) // 403/404 → null, matching the stub contract
  }
  const base = ROSTER.find((c) => c.id === id)
  if (!base) return Promise.resolve(null)
  const detail: ClientDetail = {
    ...base,
    sessionsList: [
      { id: "s1", date: "2026-07-15", topic: "Quarterly review", durationMin: 60 },
      { id: "s2", date: "2026-07-01", topic: "Goal alignment", durationMin: 45 },
      { id: "s3", date: "2026-06-17", topic: "PRISM debrief", durationMin: 60 },
    ].slice(0, Math.max(1, base.sessions % 4 || 3)),
    goals: base.topGoals.map((g, i) => ({ id: `g${i}`, title: g, objective: `Make measurable progress on ${g.toLowerCase()} this quarter.` })),
    prismScores:
      base.prismStatus === "ready"
        ? [
            { dimension: "Gold", score: 34 },
            { dimension: "Green", score: 22 },
            { dimension: "Blue", score: 26 },
            { dimension: "Orange", score: 18 },
          ]
        : [],
    conversations: [
      { id: "cv1", date: "2026-07-14", preview: "Discussed delegation approach and next steps…" },
      { id: "cv2", date: "2026-06-30", preview: "Reviewed PRISM profile strengths…" },
    ],
    resources: resourcesFor(base.resourcesPresent),
    // Fixtures fabricate presence for every resource, so nothing is unknown here.
    resourcesUnchecked: [],
    followUps: [
      { id: "f1", date: "2026-07-22", note: "Send leadership reading list" },
      { id: "f2", date: "2026-07-29", note: "Check progress on delegation goal" },
    ],
    topics: ["Delegation", "Executive presence", "Difficult conversations"],
  }
  return Promise.resolve(detail)
}

export function addClient(input: { name: string; email: string; org?: string }): Promise<ClientSummary> {
  if (USE_COACH_BACKEND) {
    return agentApi
      .post<Envelope<BeClient>>("/v1/agents/coach/clients", {
        name: input.name,
        email: input.email,
        org: input.org,
      })
      .then((r) => toSummary(r.data?.data ?? { client_id: `pending-${input.email}` }))
  }
  const client: ClientSummary = {
    id: `cl-new-${input.email}`,
    name: input.name,
    email: input.email,
    org: input.org ?? "",
    sessions: 0,
    prismScore: null,
    prismStatus: "none",
    topGoals: [],
    resourcesPresent: 0,
    status: "new",
  }
  return Promise.resolve(client)
}

export function bulkImportClients(rows: Array<{ name: string; email: string; org?: string }>): Promise<{ imported: number }> {
  if (USE_COACH_BACKEND) {
    return agentApi
      .post<Envelope<{ imported?: number }>>("/v1/agents/coach/clients/import", { rows })
      .then((r) => ({ imported: Number(r.data?.data?.imported ?? 0) }))
  }
  return Promise.resolve({ imported: rows.length })
}

/**
 * Resource upload. The real per-resource ingest (assessment import + presigned
 * document upload) is a follow-on; kept as an accepted no-op in both modes so
 * the ArtifactStatusMatrix upload affordance stays functional without fabricating
 * a persisted result.
 */
/**
 * doc_kind for the three resources that ARE documents. The other seven are not
 * document uploads at all: the six assessments go through assessment import and
 * goals through the goal store, so there is nothing here that could store them.
 */
const RESOURCE_DOC_KIND: Partial<Record<ResourceKey, "resume" | "bio" | "personal">> = {
  resume: "resume",
  bio: "bio",
  additional_info: "personal",
}

/**
 * Attach a document ABOUT a client.
 *
 * This used to be `Promise.resolve({ ok: true })` — it discarded the file and
 * reported success, so a coach uploaded a résumé, saw a success toast, and the
 * file was gone. Anything this function cannot actually store now REJECTS.
 *
 * Reuses the same presigned three-step as Honor's `uploadFellowDocument`; the
 * `subject_user_id` override is what attributes the row to the client while the
 * uploading coach stays `user_id`, which is exactly the scope the read endpoint
 * enforces. document-service already allows this for `practitioner`.
 */
export async function uploadClientResource(
  clientId: string,
  resource: ResourceKey,
  file?: File,
): Promise<{ ok: true }> {
  const docKind = RESOURCE_DOC_KIND[resource]
  if (!docKind) {
    throw new Error(
      `${resource} is not a document upload — assessments are added through import, goals through the goal store.`,
    )
  }
  if (!file) throw new Error("Choose a file to upload.")
  if (!USE_COACH_BACKEND) {
    throw new Error("Client uploads are not available in this environment.")
  }

  // The key the coach's uploads about this client are stored under: their linked
  // IG sub once invited, else the client_id they were imported under. Same
  // fallback the backend uses, so read and write agree.
  const subjectUserId = await resolveSubjectKey(clientId)

  const presigned = await initiateUpload({
    filename: file.name,
    content_type: file.type || "application/octet-stream",
    file_size: file.size,
    doc_kind: docKind,
    subject_user_id: subjectUserId,
  })
  await uploadToS3(presigned.upload_url, presigned.upload_fields, file)
  await triggerProcessing(presigned.document_id)
  return { ok: true }
}

async function resolveSubjectKey(clientId: string): Promise<string> {
  const r = await agentApi.get<Envelope<BeClient>>(
    `/v1/agents/coach/clients/${encodeURIComponent(clientId)}`,
  )
  return r.data?.data?.linked_user_sub || clientId
}

/** Artefacts THIS coach uploaded about the client. */
export async function getClientArtifacts(clientId: string): Promise<BeArtifacts | null> {
  if (!USE_COACH_BACKEND) return null
  try {
    const r = await agentApi.get<Envelope<BeArtifacts>>(
      `/v1/agents/coach/clients/${encodeURIComponent(clientId)}/artifacts`,
    )
    return r.data?.data ?? null
  } catch {
    // Null means "not known", which the caller renders as not-checked. It must
    // never collapse into `false` — that would assert absence off a failed call.
    return null
  }
}

export function listSchedule(): Promise<ScheduleEntry[]> {
  if (USE_COACH_BACKEND) {
    return agentApi
      .get<Envelope<BeSession[]>>("/v1/agents/coach/schedule")
      .then((r) => (r.data?.data ?? []).map(toScheduleEntry))
  }
  return Promise.resolve(SCHEDULE)
}

export function createSessionsBulk(input: BulkScheduleInput): Promise<BulkScheduleResult> {
  if (USE_COACH_BACKEND) {
    return agentApi
      .post<Envelope<{ created?: number; sessions?: BeSession[] }>>("/v1/agents/coach/schedule/sessions", {
        clientIds: input.clientIds,
        startsAt: input.startsAt,
        durationMin: input.durationMin,
        spacingMin: input.spacingMin,
        topic: input.topic,
        message: input.message,
        sendInvites: input.sendInvites,
      })
      .then((r) => {
        const entries = (r.data?.data?.sessions ?? []).map(toScheduleEntry)
        return { created: Number(r.data?.data?.created ?? entries.length), emailed: 0, entries }
      })
  }
  const start = new Date(input.startsAt).getTime()
  const step = (input.durationMin + input.spacingMin) * 60_000
  const byId = new Map(ROSTER.map((c) => [c.id, c.name]))
  const entries: ScheduleEntry[] = input.clientIds.map((id, i) => ({
    id: `sch-new-${id}-${i}`,
    clientName: byId.get(id) ?? id,
    startsAt: new Date(start + i * step).toISOString(),
    durationMin: input.durationMin,
    topic: input.topic,
  }))
  return Promise.resolve({
    created: entries.length,
    emailed: input.sendInvites ? entries.length : 0,
    entries,
  })
}

export function getCreditsSummary(): Promise<CreditsSummary> {
  if (USE_COACH_BACKEND) {
    return agentApi
      .get<Envelope<BeCredits>>("/v1/agents/coach/credits")
      .then((r) => ({
        balance: Number(r.data?.data?.balance ?? 0),
        allocated: Number(r.data?.data?.allocated ?? 0),
        used: Number(r.data?.data?.used ?? 0),
        currency: "PUK",
      }))
  }
  return Promise.resolve({ balance: 340, allocated: 500, used: 160, currency: "PUK" })
}

export function getClientUsage(): Promise<ClientUsageRow[]> {
  if (USE_COACH_BACKEND) {
    return agentApi
      .get<Envelope<BeUsage[]>>("/v1/agents/coach/clients/usage")
      .then((r) =>
        (r.data?.data ?? []).map((u) => ({
          clientName: u.name ?? u.clientId,
          sessions: Number(u.sessions ?? 0),
          creditsUsed: Number(u.creditsUsed ?? 0),
          lastActive: "",
        })),
      )
  }
  return Promise.resolve(
    ROSTER.map((c) => ({
      clientName: c.name,
      sessions: c.sessions,
      creditsUsed: c.sessions * 2,
      lastActive: "2026-07-15",
    })),
  )
}
