import { getApi } from "@/lib/agentApi"
import { api } from "@/lib/axios"
import type { VerticalApiResponse } from "@/verticals/core"
import type {
  BlueprintGenerateRequest,
  BlueprintGenerateResponse,
  BuildCurriculumRequest,
  BuiltCurriculum,
  ExtractRequest,
  ExtractResponse,
  JobDnaTaxonomySeed,
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

/**
 * GET /v1/blueprint/job-dna/{blueprintId}/knowledge-taxonomy — fetch a Job
 * Blueprint's knowledge-taxonomy seed (Build C). This is a blueprint-service
 * endpoint, so it routes through the `api` instance (API Gateway), NOT the Agent
 * Engine. The returned `nodes` are snake_case and map straight onto
 * `BlueprintSeedNode` to seed the generate call.
 */
export async function getJobDnaKnowledgeTaxonomy(blueprintId: string) {
  const { data } = await api.get<VerticalApiResponse<JobDnaTaxonomySeed>>(
    `/v1/blueprint/job-dna/${blueprintId}/knowledge-taxonomy`
  )
  return data
}

/**
 * POST /v1/agents/kce/curriculum/build — Echo assembles already-validated units
 * into a wiring-adapted curriculum (deterministic, no LLM). The returned
 * `modules` map 1:1 onto the trainer-service publish body (`publishCurriculum`),
 * which re-enforces the citation gate. Lives on the Agent Engine, so it routes
 * through `getApi()` like the other capture LLM/agent endpoints.
 */
export async function buildCurriculum(body: BuildCurriculumRequest) {
  const { data } = await getApi().post<VerticalApiResponse<BuiltCurriculum>>(
    `/v1/agents/kce/curriculum/build`,
    body
  )
  return data
}
