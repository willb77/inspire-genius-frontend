import { getApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type { SavedPrompt, SavedPromptsList } from "@/types/lumen"

// Lumen lives on the Agent Engine — `/v1/agents/*` through `agentApi`, never
// the monolith `api` instance.
const PREFIX = "/v1/agents/lumen/saved-prompts"

/**
 * GET — the caller's kept situations, most-reached-for first.
 *
 * Ordered server-side by use count rather than recency: a situation saved
 * months ago and used weekly is the one that belongs at the top.
 */
export async function getSavedPrompts() {
  const { data } = await getApi().get<VerticalApiResponse<SavedPromptsList>>(PREFIX)
  return data
}

/**
 * POST — keep a situation.
 *
 * Re-saving one the caller already kept is deliberately not an error: it
 * promotes the existing entry rather than creating a duplicate.
 */
export async function createSavedPrompt(text: string, label?: string) {
  const { data } = await getApi().post<VerticalApiResponse<SavedPrompt>>(PREFIX, {
    text,
    ...(label ? { label } : {}),
  })
  return data
}

/** POST /{id}/used — record a reuse so the list can order by it. */
export async function useSavedPrompt(promptId: string) {
  const { data } = await getApi().post<VerticalApiResponse<SavedPrompt>>(
    `${PREFIX}/${promptId}/used`,
    {}
  )
  return data
}

/**
 * DELETE — unpin a situation.
 *
 * The Moments it produced are untouched: unpinning is not a request to forget
 * the advice. A prompt the caller doesn't own returns 404 by design, so a
 * failure here is genuinely "not found" rather than "not yours".
 */
export async function deleteSavedPrompt(promptId: string) {
  const { data } = await getApi().delete<VerticalApiResponse<{ deleted: boolean }>>(
    `${PREFIX}/${promptId}`
  )
  return data
}
