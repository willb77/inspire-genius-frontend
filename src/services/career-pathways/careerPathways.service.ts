import { agentApi } from "@/lib/agentApi"
import type {
  CareerPathwaysEnvelope,
  CareerPathwaysStatus,
  Draft,
  FileFormat,
  OpenedProfile,
  RecipientList,
  Share,
  ShareRequest,
  Snapshot,
  SnapshotRequest,
} from "@/types/careerPathways"

/**
 * N-8 Career Pathways Profile. Agent-engine routes, so `agentApi`, under the
 * `/v1/agents/` prefix. The candidate is always the token's own user; nothing
 * here names anyone else, and no recipient address is ever sent or received.
 */
export const CAREER_PATHWAYS_BASE = "/v1/agents/career-pathways"

/** Is the profile on for me? A 404 (route not deployed), any error, or a
 * malformed answer all read as OFF, so the page never offers what would fail. */
export async function getCareerPathwaysStatus(): Promise<CareerPathwaysStatus> {
  try {
    const { data } = await agentApi.get<CareerPathwaysEnvelope<Partial<CareerPathwaysStatus>>>(
      `${CAREER_PATHWAYS_BASE}/status`,
    )
    const enabled = data?.data?.enabled === true
    return { enabled, externalSharing: enabled && data?.data?.externalSharing === true }
  } catch {
    return { enabled: false, externalSharing: false }
  }
}

export async function getDraft(): Promise<Draft> {
  const { data } = await agentApi.get<CareerPathwaysEnvelope<Draft>>(`${CAREER_PATHWAYS_BASE}/draft`)
  return data.data
}

export async function createSnapshot(body: SnapshotRequest): Promise<Snapshot> {
  const { data } = await agentApi.post<CareerPathwaysEnvelope<Snapshot>>(`${CAREER_PATHWAYS_BASE}/snapshots`, body)
  return data.data
}

export async function listSnapshots(): Promise<Snapshot[]> {
  const { data } = await agentApi.get<CareerPathwaysEnvelope<{ snapshots: Snapshot[] }>>(
    `${CAREER_PATHWAYS_BASE}/snapshots`,
  )
  return data.data.snapshots
}

export async function approveSnapshot(id: string): Promise<Snapshot> {
  const { data } = await agentApi.post<CareerPathwaysEnvelope<Snapshot>>(
    `${CAREER_PATHWAYS_BASE}/snapshots/${encodeURIComponent(id)}/approve`,
  )
  return data.data
}

export async function downloadSnapshot(id: string, format: FileFormat): Promise<{ downloadUrl: string }> {
  const { data } = await agentApi.post<CareerPathwaysEnvelope<{ downloadUrl: string }>>(
    `${CAREER_PATHWAYS_BASE}/snapshots/${encodeURIComponent(id)}/download`,
    { format },
  )
  return data.data
}

export async function listRecipients(): Promise<RecipientList> {
  const { data } = await agentApi.get<CareerPathwaysEnvelope<RecipientList>>(`${CAREER_PATHWAYS_BASE}/recipients`)
  return data.data
}

export async function createShare(body: ShareRequest): Promise<Share> {
  const { data } = await agentApi.post<CareerPathwaysEnvelope<Share>>(`${CAREER_PATHWAYS_BASE}/shares`, body)
  return data.data
}

export async function listShares(): Promise<Share[]> {
  const { data } = await agentApi.get<CareerPathwaysEnvelope<{ shares: Share[] }>>(`${CAREER_PATHWAYS_BASE}/shares`)
  return data.data.shares
}

export async function revokeShare(id: string): Promise<Share> {
  const { data } = await agentApi.post<CareerPathwaysEnvelope<Share>>(
    `${CAREER_PATHWAYS_BASE}/shares/${encodeURIComponent(id)}/revoke`,
  )
  return data.data
}

// ── the recipient (no sign-in; the token is from the URL fragment) ──────────

export async function requestCode(token: string): Promise<void> {
  await agentApi.post(`${CAREER_PATHWAYS_BASE}/public/code`, { token })
}

export async function openShared(token: string, code: string): Promise<OpenedProfile> {
  const { data } = await agentApi.post<CareerPathwaysEnvelope<OpenedProfile>>(
    `${CAREER_PATHWAYS_BASE}/public/open`,
    { token, code },
  )
  return data.data
}

export async function downloadShared(token: string, viewKey: string, format: FileFormat): Promise<Blob> {
  const { data } = await agentApi.post<Blob>(
    `${CAREER_PATHWAYS_BASE}/public/download`,
    { token, viewKey, format },
    { responseType: "blob" },
  )
  return data
}
