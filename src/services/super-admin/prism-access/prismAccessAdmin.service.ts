import { agentApi } from "@/lib/agentApi";
import type {
  ApproverList,
  ApproverStatus,
  Approver,
  OrgPrismAccess,
  OrgPrismAccessChange,
  UserPrismAccess,
  UserPrismAccessChange,
} from "@/types/super-admin/prism-access";

/**
 * PRISM survey access admin + the approver allowlist (agent-engine).
 *
 * Mounted under `/v1/agents/` because that is the only prefix API Gateway
 * routes to the engine, so these go through `agentApi`. Every route needs a
 * verified super-admin who is also an approver; the approver routes need the
 * owner. The backend decides both — nothing here knows who anyone is.
 */
const ACCESS = "/v1/agents/prism/admin/access";
const APPROVERS = "/v1/agents/admin/approvers";

const enc = encodeURIComponent;

export async function getMyApproverStatus(): Promise<ApproverStatus> {
  const { data } = await agentApi.get<ApproverStatus>(`${APPROVERS}/me`);
  return data;
}

export async function getUserPrismAccess(userId: string): Promise<UserPrismAccess> {
  const { data } = await agentApi.get<UserPrismAccess>(`${ACCESS}/users/${enc(userId)}`);
  return data;
}

export async function grantUserPrismAccess(userId: string): Promise<UserPrismAccessChange> {
  const { data } = await agentApi.post<UserPrismAccessChange>(
    `${ACCESS}/users/${enc(userId)}/grant`,
  );
  return data;
}

export async function revokeUserPrismAccess(userId: string): Promise<UserPrismAccessChange> {
  const { data } = await agentApi.post<UserPrismAccessChange>(
    `${ACCESS}/users/${enc(userId)}/revoke`,
  );
  return data;
}

export async function getOrgPrismAccess(orgId: string): Promise<OrgPrismAccess> {
  const { data } = await agentApi.get<OrgPrismAccess>(`${ACCESS}/orgs/${enc(orgId)}`);
  return data;
}

/** List (true) or unlist (false) the organisation. The switch is fixed server-side. */
export async function setOrgPrismAccess(
  orgId: string,
  listed: boolean,
): Promise<OrgPrismAccessChange> {
  const url = `${ACCESS}/orgs/${enc(orgId)}`;
  const { data } = listed
    ? await agentApi.put<OrgPrismAccessChange>(url)
    : await agentApi.delete<OrgPrismAccessChange>(url);
  return data;
}

export async function listApprovers(): Promise<ApproverList> {
  const { data } = await agentApi.get<ApproverList>(APPROVERS);
  return data;
}

export async function addApprover(body: {
  capability: string;
  email: string;
}): Promise<Approver> {
  const { data } = await agentApi.post<Approver>(APPROVERS, body);
  return data;
}

export async function removeApprover(id: string): Promise<{ id: string; removed: boolean }> {
  const { data } = await agentApi.delete<{ id: string; removed: boolean }>(
    `${APPROVERS}/${enc(id)}`,
  );
  return data;
}
