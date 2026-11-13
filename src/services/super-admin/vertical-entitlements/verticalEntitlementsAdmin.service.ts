import { agentApi } from "@/lib/agentApi";
import type {
  EntitlementChange,
  UserEntitlements,
} from "@/types/super-admin/vertical-entitlements";

/**
 * Vertical entitlements admin (agent-engine).
 *
 * Mounted under `/v1/agents/` because that is the only prefix API Gateway
 * routes to the engine, so these go through `agentApi`. Every route needs a
 * verified super-admin who is also an approver for vertical entitlements; the
 * backend decides that — nothing here knows who anyone is.
 */
const BASE = "/v1/agents/admin/entitlements";

const enc = encodeURIComponent;

export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const { data } = await agentApi.get<UserEntitlements>(`${BASE}/users/${enc(userId)}`);
  return data;
}

export async function grantVertical(userId: string, vertical: string): Promise<EntitlementChange> {
  const { data } = await agentApi.post<EntitlementChange>(`${BASE}/users/${enc(userId)}/grant`, {
    vertical,
  });
  return data;
}

export async function revokeVertical(userId: string, vertical: string): Promise<EntitlementChange> {
  const { data } = await agentApi.post<EntitlementChange>(`${BASE}/users/${enc(userId)}/revoke`, {
    vertical,
  });
  return data;
}
