// STUB service for the practitioner client-management surfaces.
//
// Returns typed fixtures so the My Clients / Schedule / Analytics wireframes are
// fully clickable ahead of the real backend. When the coach backend lands
// (generalize the Honor /v1/agents/honor/coach/* routes to /v1/agents/coach/*,
// per the build plan), replace the bodies here with real axios calls through
// getApi()/agentApi — the pages and hooks do not change.
//
// Every export is a Promise so the swap to real HTTP is a drop-in.

import {
  CLIENT_RESOURCES,
  type ClientSummary,
  type ClientDetail,
  type ResourceKey,
  type ScheduleEntry,
  type BulkScheduleInput,
  type BulkScheduleResult,
  type CreditsSummary,
  type ClientUsageRow,
} from "@/types/practitioner/coachClient"

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

export function listClients(): Promise<ClientSummary[]> {
  return Promise.resolve(ROSTER)
}

export function getClient(id: string): Promise<ClientDetail | null> {
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
    followUps: [
      { id: "f1", date: "2026-07-22", note: "Send leadership reading list" },
      { id: "f2", date: "2026-07-29", note: "Check progress on delegation goal" },
    ],
    topics: ["Delegation", "Executive presence", "Difficult conversations"],
  }
  return Promise.resolve(detail)
}

export function addClient(input: { name: string; email: string; org?: string }): Promise<ClientSummary> {
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
  return Promise.resolve({ imported: rows.length })
}

/** Stub resource upload — the real impl attributes docs to the client's RAG. */
export function uploadClientResource(_clientId: string, _resource: ResourceKey, _file?: File): Promise<{ ok: true }> {
  return Promise.resolve({ ok: true })
}

const SCHEDULE: ScheduleEntry[] = [
  { id: "sch-1", clientName: "Marcus Chen", startsAt: "2026-07-23T15:00:00", durationMin: 60, topic: "Delegation deep-dive" },
  { id: "sch-2", clientName: "Sophie Laurent", startsAt: "2026-07-24T17:00:00", durationMin: 45, topic: "Executive presence" },
]

export function listSchedule(): Promise<ScheduleEntry[]> {
  return Promise.resolve(SCHEDULE)
}

export function createSessionsBulk(input: BulkScheduleInput): Promise<BulkScheduleResult> {
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
  return Promise.resolve({ balance: 340, allocated: 500, used: 160, currency: "PUK" })
}

export function getClientUsage(): Promise<ClientUsageRow[]> {
  return Promise.resolve(
    ROSTER.map((c) => ({
      clientName: c.name,
      sessions: c.sessions,
      creditsUsed: c.sessions * 2,
      lastActive: "2026-07-15",
    })),
  )
}
