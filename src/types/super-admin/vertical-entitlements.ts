/**
 * Vertical entitlements admin — shapes returned by the agent-engine routes
 * `/v1/agents/admin/entitlements/*`. Raw JSON (no BaseApiResponse envelope).
 *
 * The backend owns the list of verticals this screen may change (`catalogue`);
 * one vertical is never in it, and this page never names or changes it.
 */
import type { AccessAdminEvent } from "@/types/super-admin/prism-access";

/** The capability these controls need. The backend owns the list. */
export const VERTICAL_ENTITLEMENTS_CAPABILITY = "vertical_entitlements";

export type EntitlementRow = {
  /** "account": keyed on the person's account; "email": a row carrying their email. */
  matched_on: "account" | "email";
  /** The managed verticals on this row. */
  verticals: string[];
  updated_at: string | null;
};

export type UserEntitlements = {
  user_id: string;
  email: string;
  /** Every vertical this screen may grant or revoke. */
  catalogue: string[];
  /** What the platform answers this person today, limited to the catalogue. */
  effective: string[];
  rows: EntitlementRow[];
  row_count: number;
  /** The rows disagree about a managed vertical; the platform reads only one. */
  conflict: boolean;
  /** Entitlements on the rows that this screen does not manage. Never named. */
  unmanaged_count: number;
  history: AccessAdminEvent[];
};

export type EntitlementChange = {
  changed: boolean;
  vertical: string;
  rows_changed: number;
  row_created?: boolean;
  view: UserEntitlements;
};
