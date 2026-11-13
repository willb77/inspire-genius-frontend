/**
 * PRISM survey access admin — shapes returned by the agent-engine routes
 * `/v1/agents/prism/admin/access/*` and `/v1/agents/admin/approvers/*`.
 * These routes return raw JSON (no BaseApiResponse envelope).
 */

/** The capability these controls need. The backend owns the list. */
export const PRISM_SURVEY_ACCESS_CAPABILITY = "prism_survey_access";

export type ApproverStatus = {
  /** True only for the owner: the one person who manages approvers. */
  is_owner: boolean;
  /** The admin controls this person may use. */
  capabilities: string[];
  known_capabilities: string[];
};

export type PrismAccessScope = "tier" | "org" | "person" | "practitioner";

export type PrismAccessCoverage = {
  /** The whole tier is switched on. */
  tier: boolean;
  /** The person's organisation is listed. */
  org: boolean;
  /** The person holds an individual approval. */
  person: boolean;
  /** What the request gate itself answers today; null = blocked. */
  effective_scope: PrismAccessScope | null;
  allowed: boolean;
};

export type PrismAccessRequestRow = {
  id: string;
  status: "requested" | "approved" | "denied";
  practitioner_name: string;
  requested_at: string | null;
  decided_at: string | null;
};

export type AccessAdminEvent = {
  id: string;
  action: string;
  actor_email: string;
  at: string | null;
  detail: Record<string, unknown>;
};

export type UserPrismAccess = {
  user: { user_id: string; name: string; email: string; org_id: string | null };
  coverage: PrismAccessCoverage;
  open_request: PrismAccessRequestRow | null;
  requests: PrismAccessRequestRow[];
  history: AccessAdminEvent[];
};

export type UserPrismAccessChange = {
  changed: boolean;
  mode: string;
  view: UserPrismAccess;
};

export type OrgPrismAccess = {
  org_id: string;
  switch: string;
  listed: boolean;
  row: { created_at: string | null; created_by: string | null } | null;
  tier: boolean;
  history: AccessAdminEvent[];
};

export type OrgPrismAccessChange = {
  changed: boolean;
  listed: boolean;
  view: OrgPrismAccess;
};

export type Approver = {
  id: string;
  capability: string;
  user_id: string | null;
  email: string;
  added_at: string | null;
  /** The owner's own row: always an approver, never removable. */
  is_owner?: boolean;
};

export type ApproverList = {
  approvers: Approver[];
  known_capabilities: string[];
};
