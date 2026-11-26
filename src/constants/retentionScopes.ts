import type { RetentionScope } from "@/services/retention/retentionService";

/**
 * The retention scopes each role may WRITE (create, update, delete).
 *
 * Mirrors `_ROLE_WRITE_SCOPES` in
 * `services/agent-engine/app/routes/retention.py` (monorepo). The server is
 * the authority and answers 403 for anything outside this table; this copy
 * only decides what the Settings "Memory Retention" card OFFERS. Keep the two
 * in step. A role with no entry, or an empty list, can write nothing, and the
 * card is not shown to it.
 *
 * Server note: a manager's `user`-scope write is further limited to their own
 * id; that per-id rule is the server's alone.
 */
export const RETENTION_WRITE_SCOPES_BY_ROLE: Readonly<
  Record<string, readonly RetentionScope[]>
> = {
  "super-admin": ["system", "org", "manager", "user"],
  "company-admin": ["org", "manager", "user"],
  manager: ["user"],
  practitioner: ["user"],
  distributor: [],
  user: [],
};

export function retentionWriteScopes(
  role: string | null | undefined,
): readonly RetentionScope[] {
  return RETENTION_WRITE_SCOPES_BY_ROLE[(role ?? "").toLowerCase()] ?? [];
}
