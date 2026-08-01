import { getApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type { PortraitAnswer, SelfPortrait } from "@/types/lumen"

// Lumen's routes live on the Agent Engine, so they go through
// `getApi()`/`agentApi` — never the monolith `api` instance. `/v1/agents/*` is
// the only prefix API Gateway routes to the engine.
const PREFIX = "/v1/agents/lumen"

/**
 * GET /v1/agents/lumen/self-portrait/{id} — the composed behavioral portrait.
 *
 * Lumen is self-only: `me` is the only id a caller may pass, and the backend
 * 403s anything else. A user with no PRISM assessment gets a well-formed
 * portrait with `prism: null`, not an error — the empty state is a product
 * surface.
 */
export async function getSelfPortrait(subjectId: string = "me") {
  const { data } = await getApi().get<VerticalApiResponse<SelfPortrait>>(
    `${PREFIX}/self-portrait/${subjectId}`
  )
  return data
}

/**
 * POST /v1/agents/lumen/self-portrait/{id}/ask — narrate the portrait or answer
 * a question about it. Omit `question` (or pass empty) for a description; pass a
 * question for a grounded answer. Self-only, same as the GET.
 */
export async function askSelfPortrait(question?: string, subjectId: string = "me") {
  const { data } = await getApi().post<VerticalApiResponse<PortraitAnswer>>(
    `${PREFIX}/self-portrait/${subjectId}/ask`,
    { question: question?.trim() || null }
  )
  return data
}
