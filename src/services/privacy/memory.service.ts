/** M.4 — service layer for /v1/memory/* tier-aware privacy endpoints.
 *
 * These endpoints live on the agent-engine, so all calls go through
 * `agentApi`. The self-service paths use the caller's JWT; the admin
 * variants require a super-admin token.
 */
import { agentApi } from "@/lib/agentApi"
import type { MemoryDeleteResponse, MemorySnapshot } from "@/types/memory"

// ─── Self-service (caller acts on own data) ─────────────────────

export async function getMyMemory(): Promise<MemorySnapshot> {
  const { data } = await agentApi.get<MemorySnapshot>("/v1/memory/me")
  return data
}

export async function exportMyMemory(): Promise<Blob> {
  const response = await agentApi.get("/v1/memory/me/export", {
    responseType: "blob",
  })
  return response.data as Blob
}

export async function deleteMyMemory(): Promise<MemoryDeleteResponse> {
  const { data } = await agentApi.delete<MemoryDeleteResponse>("/v1/memory/me")
  return data
}

export async function deleteMyInsight(key: string): Promise<MemoryDeleteResponse> {
  const { data } = await agentApi.delete<MemoryDeleteResponse>(
    `/v1/memory/me/insights/${encodeURIComponent(key)}`,
  )
  return data
}

// ─── Super-admin variants (operator on behalf of target user) ───

export async function getUserMemory(userId: string): Promise<MemorySnapshot> {
  const { data } = await agentApi.get<MemorySnapshot>(
    `/v1/memory/users/${encodeURIComponent(userId)}`,
  )
  return data
}

export async function exportUserMemory(userId: string): Promise<Blob> {
  const response = await agentApi.get(
    `/v1/memory/users/${encodeURIComponent(userId)}/export`,
    { responseType: "blob" },
  )
  return response.data as Blob
}

export async function deleteUserMemory(userId: string): Promise<MemoryDeleteResponse> {
  const { data } = await agentApi.delete<MemoryDeleteResponse>(
    `/v1/memory/users/${encodeURIComponent(userId)}`,
  )
  return data
}

export async function deleteUserInsight(
  userId: string,
  key: string,
): Promise<MemoryDeleteResponse> {
  const { data } = await agentApi.delete<MemoryDeleteResponse>(
    `/v1/memory/users/${encodeURIComponent(userId)}/insights/${encodeURIComponent(key)}`,
  )
  return data
}

/**
 * Trigger a browser download for a Blob. Used by both export hooks so the
 * "Download my data" button hands the user a real `.json` file rather than
 * silently re-fetching the bytes into memory.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
