/**
 * Profile service — typed wrappers for the agent-engine
 * `/v1/profile/me/*` routes shipped by G5 (monorepo PR #431).
 *
 * Per `.claude/rules/agents.md` §1, agent-engine routes go through
 * `agentApi` directly (not `getApi()`) — these endpoints live on the
 * Agent Engine ECS service, not the monolith.
 *
 * Backend dependency: monorepo PR #431. Until that PR is deployed,
 * these routes 404 — `useLoadedFrameworks()` is the only one that
 * matters at runtime (the `AGENT_ENGINE_USER_PROFILE_PLATFORM_ENABLED`
 * flag, default OFF, gates everything else on the server side).
 */

import { agentApi } from "@/lib/agentApi";
import type {
  Assessment,
  AssessmentCreated,
  AssessmentHistoryItem,
  AssessmentHistoryResponse,
  AssessmentImportConfirm,
  AssessmentImportPreview,
  CreateAssessmentRequest,
  CreateFactRequest,
  LoadedFramework,
  PendingImport,
  PendingImportsResponse,
  ProfileFact,
  ProfileMe,
  TrendResponse,
} from "@/types/profile/profile-types";

const BASE = "/v1/profile/me";

/** GET /v1/profile/me — full profile snapshot (facts + loaded frameworks). */
export async function getMyProfile(): Promise<ProfileMe> {
  const { data } = await agentApi.get<ProfileMe>(BASE);
  return data;
}

/** GET /v1/profile/me/assessments — paginated assessment history. */
export async function listAssessments(params: {
  framework?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<AssessmentHistoryResponse> {
  const { framework, limit = 20, offset = 0 } = params;
  const { data } = await agentApi.get<AssessmentHistoryResponse>(
    `${BASE}/assessments`,
    { params: { framework, limit, offset } },
  );
  return data;
}

/**
 * DELETE /v1/profile/me/assessments/{id} — remove one of your own entered or
 * uploaded results (TDS F-W7-1 Part B). Soft on the server: the row stays,
 * stops counting, and the earlier result (if any) becomes current again.
 * 404 someone else's or missing, 403 PRISM or not yours to remove, 409
 * already removed.
 */
export async function removeAssessment(id: string): Promise<AssessmentHistoryItem> {
  const { data } = await agentApi.delete<AssessmentHistoryItem>(
    `${BASE}/assessments/${encodeURIComponent(id)}`,
  );
  return data;
}

/** GET /v1/profile/me/trend — single-dimension trend points. */
export async function getTrend(params: {
  framework: string;
  dimension: string;
}): Promise<TrendResponse> {
  const { data } = await agentApi.get<TrendResponse>(`${BASE}/trend`, {
    params: { framework: params.framework, dimension: params.dimension },
  });
  return data;
}

/** GET /v1/profile/me/loaded-frameworks — cheap list of frameworks the user has. */
export async function getLoadedFrameworks(): Promise<LoadedFramework[]> {
  const { data } = await agentApi.get<{ frameworks: LoadedFramework[] } | LoadedFramework[]>(
    `${BASE}/loaded-frameworks`,
  );
  // Backend may return `{ frameworks: [...] }` envelope or bare list.
  if (Array.isArray(data)) return data;
  return data?.frameworks ?? [];
}

/**
 * POST /v1/profile/me/assessments/import — upload a report FILE for a
 * framework; the server runs the framework adapter on the bytes and stores
 * the assessment. Multipart; the browser cannot run the adapters.
 */
export async function importAssessment(
  framework: string,
  file: File,
): Promise<AssessmentCreated> {
  const form = new FormData();
  form.append("framework", framework);
  form.append("file", file);
  const { data } = await agentApi.post<AssessmentCreated>(
    `${BASE}/assessments/import`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

/**
 * POST /v1/profile/me/assessments/import/preview — parse a report and return
 * the scores WITHOUT saving (confirm-before-save step 1).
 */
export async function previewImportAssessment(
  framework: string,
  file: File,
): Promise<AssessmentImportPreview> {
  const form = new FormData();
  form.append("framework", framework);
  form.append("file", file);
  const { data } = await agentApi.post<AssessmentImportPreview>(
    `${BASE}/assessments/import/preview`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

/**
 * POST /v1/profile/me/assessments/import/confirm — save the reviewed scores
 * from a preview (confirm-before-save step 2).
 */
export async function confirmImportAssessment(
  body: AssessmentImportConfirm,
): Promise<AssessmentCreated> {
  const { data } = await agentApi.post<AssessmentCreated>(
    `${BASE}/assessments/import/confirm`,
    body,
  );
  return data;
}

/** POST /v1/profile/me/facts — append a single user-supplied fact. */
export async function createFact(body: CreateFactRequest): Promise<ProfileFact> {
  const payload = { source: "user_input", ...body };
  const { data } = await agentApi.post<ProfileFact>(`${BASE}/facts`, payload);
  return data;
}

/** DELETE /v1/profile/me/facts/{id} — soft-delete (server marks superseded). */
export async function deleteFact(factId: string): Promise<void> {
  await agentApi.delete(`${BASE}/facts/${encodeURIComponent(factId)}`);
}

/** POST /v1/profile/me/assessments — record a self-reported prior assessment. */
export async function createAssessment(
  body: CreateAssessmentRequest,
): Promise<Assessment> {
  const payload = { source: "user_input", ...body };
  const { data } = await agentApi.post<Assessment>(
    `${BASE}/assessments`,
    payload,
  );
  return data;
}

/**
 * GET /v1/profile/me/assessments/pending — results a practitioner sent you
 * that you have neither accepted nor declined (TDS A4). They count for
 * nothing, for Meridian or anyone's view, until accepted.
 */
export async function listPendingImports(): Promise<PendingImport[]> {
  const { data } = await agentApi.get<PendingImportsResponse>(`${BASE}/assessments/pending`);
  return data?.items ?? [];
}

/**
 * POST /v1/profile/me/assessments/{id}/accept — accept a result a
 * practitioner sent you; it becomes your current result for that framework.
 * 404 not yours, 403 not a practitioner's import, 409 already accepted or
 * declined. Declining is `removeAssessment` (the owner remove).
 */
export async function acceptPendingImport(id: string): Promise<AssessmentHistoryItem> {
  const { data } = await agentApi.post<AssessmentHistoryItem>(
    `${BASE}/assessments/${encodeURIComponent(id)}/accept`,
  );
  return data;
}
