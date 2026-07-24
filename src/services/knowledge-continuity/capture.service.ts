import { getApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type {
  BlueprintGenerateRequest,
  BlueprintGenerateResponse,
  ExtractRequest,
  ExtractResponse,
  NextQuestionRequest,
  NextQuestionResponse,
} from "@/types/knowledge-continuity"

// The two capture LLM endpoints live on the Agent Engine (Maven, synthesized by
// Meridian), NOT the trainer-service. They therefore route through
// `getApi()`/`agentApi` (ECS Fargate), while all persistence
// (taxonomy/sessions/turns/synthesize) stays on the `api` instance in
// continuity.service.ts.
const PREFIX = "/v1/agents/kce/capture"

/**
 * POST /v1/agents/kce/capture/next-question — ask Maven for the next interview
 * question given the running transcript. Pass `is_first: true` with an empty
 * transcript to open the interview.
 */
export async function nextQuestion(body: NextQuestionRequest) {
  const { data } = await getApi().post<VerticalApiResponse<NextQuestionResponse>>(
    `${PREFIX}/next-question`,
    body
  )
  return data
}

/**
 * POST /v1/agents/kce/capture/extract — distill the full interview transcript
 * into scored knowledge units ready to synthesize into the Reviewer Console.
 */
export async function extractUnits(body: ExtractRequest) {
  const { data } = await getApi().post<VerticalApiResponse<ExtractResponse>>(
    `${PREFIX}/extract`,
    body
  )
  return data
}

/**
 * POST /v1/agents/kce/blueprint/generate — draft a role-knowledge taxonomy for
 * review (Build B). Also an Agent-Engine (Maven-tier) endpoint, so it routes
 * through `getApi()`; the LLM proposes structure only — nothing persists here.
 * The approved tree is written via the trainer-service taxonomy endpoint.
 */
export async function generateBlueprint(body: BlueprintGenerateRequest) {
  const { data } = await getApi().post<VerticalApiResponse<BlueprintGenerateResponse>>(
    `/v1/agents/kce/blueprint/generate`,
    body
  )
  return data
}
