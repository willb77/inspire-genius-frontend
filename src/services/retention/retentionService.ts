/**
 * Memory-retention policy CRUD service.
 *
 * Mirrors `services/agent-engine/app/routes/retention.py`:
 *   GET    /v1/retention/policies
 *   GET    /v1/retention/policies/effective?user_id&memory_tier
 *   POST   /v1/retention/policies
 *   DELETE /v1/retention/policies/{id}
 *
 * Pure Axios — the React hook layer wraps these in React Query.
 */
import { agentApi } from "@/lib/agentApi";

export type RetentionScope = "system" | "org" | "manager" | "user";
export type RetentionTier = "working" | "short_term" | "long_term" | "semantic";

export type RetentionPolicy = {
  id: string;
  scope: RetentionScope;
  scope_id: string | null;
  memory_tier: RetentionTier;
  retention_days: number | null;
  archive_to_s3: boolean;
  set_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type RetentionPoliciesResponse = {
  status: boolean;
  data: { policies: RetentionPolicy[] };
};

export type EffectivePolicy = {
  scope: RetentionScope;
  scope_id: string | null;
  memory_tier: RetentionTier;
  retention_days: number | null;
  archive_to_s3: boolean;
  source: string;
};

export type EffectivePolicyResponse = {
  status: boolean;
  data: EffectivePolicy;
};

export type RetentionUpsertPayload = {
  scope: RetentionScope;
  scope_id?: string | null;
  memory_tier: RetentionTier;
  retention_days: number | null;
  archive_to_s3: boolean;
};

export async function listRetentionPolicies(params?: {
  scope?: RetentionScope;
  memory_tier?: RetentionTier;
}): Promise<RetentionPoliciesResponse> {
  const resp = await agentApi.get<RetentionPoliciesResponse>(
    "/v1/retention/policies",
    { params },
  );
  return resp.data;
}

export async function getEffectivePolicy(params: {
  memory_tier: RetentionTier;
  user_id?: string;
  org_id?: string;
  manager_id?: string;
}): Promise<EffectivePolicyResponse> {
  const resp = await agentApi.get<EffectivePolicyResponse>(
    "/v1/retention/policies/effective",
    { params },
  );
  return resp.data;
}

export async function upsertRetentionPolicy(
  body: RetentionUpsertPayload,
): Promise<{ status: boolean; data: { id: string } }> {
  const resp = await agentApi.post<{ status: boolean; data: { id: string } }>(
    "/v1/retention/policies",
    body,
  );
  return resp.data;
}

export async function deleteRetentionPolicy(
  policyId: string,
): Promise<{ status: boolean; message: string }> {
  const resp = await agentApi.delete<{ status: boolean; message: string }>(
    `/v1/retention/policies/${policyId}`,
  );
  return resp.data;
}
