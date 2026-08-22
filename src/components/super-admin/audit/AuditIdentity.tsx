/**
 * Actor / target identity for the audit log.
 *
 * Audit rows are written with `actor_id` and `target_id` as bare UUIDs, and
 * `actor_email` is a denormalised convenience column that only some emitters
 * populate (the invitation-service does; the agent-engine and trainer do not).
 * The table therefore used to render the CLASS of the actor — "user",
 * "system" — which tells an operator nothing about who actually did the
 * thing, and dropped `target_id` entirely.
 *
 * This resolves both against the user-management roster: one paged fetch,
 * held in React Query cache, keyed by user id. Where the roster has no entry
 * (a system actor, a deleted user, a target that is not a person) the id is
 * shown as-is rather than being hidden — an unresolvable id is information,
 * an em-dash is not.
 */
import { useMemo } from "react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement"
import type { UserManagementUser } from "@/services/super-admin/user-management/user-management.service"

export type ResolvedIdentity = {
  email?: string
  fullName?: string
  role?: string
  status?: string
}

export type IdentityIndex = {
  byId: Map<string, UserManagementUser>
  /** False while the roster is still loading, so callers can avoid rendering
   *  a raw UUID that is about to resolve into a name. */
  ready: boolean
}

/**
 * One roster fetch shared by every row.
 *
 * `limit: 500` deliberately: the alternative — a lookup per distinct id —
 * would fire dozens of requests per page of audit rows. If the roster ever
 * exceeds this, rows beyond it degrade to showing the raw id, which is the
 * same behaviour as an unknown actor and is honest about what we know.
 */
export function useIdentityIndex(): IdentityIndex {
  const { data, isLoading } = useUserManagement({ page: 1, limit: 500 })

  return useMemo(() => {
    const byId = new Map<string, UserManagementUser>()
    const users = data?.data?.users ?? []
    for (const u of users) {
      if (u.user_id) byId.set(String(u.user_id).toLowerCase(), u)
    }
    return { byId, ready: !isLoading }
  }, [data, isLoading])
}

function displayName(u: UserManagementUser): string {
  const joined = [u.first_name, u.last_name].filter(Boolean).join(" ").trim()
  return u.full_name?.trim() || joined || u.email || u.user_id
}

export function resolveIdentity(
  index: IdentityIndex,
  id?: string | null,
  fallbackEmail?: string | null,
): ResolvedIdentity | null {
  const hit = id ? index.byId.get(String(id).toLowerCase()) : undefined
  if (hit) {
    return {
      email: hit.email,
      fullName: displayName(hit),
      role: hit.role,
      status: hit.user_status,
    }
  }
  if (fallbackEmail) return { email: fallbackEmail }
  return null
}

type IdentityCellProps = {
  /** UUID from the audit row (`actor_id` / `target_id`). */
  id?: string | null
  /** Denormalised email the emitter wrote, if any. Wins over the roster. */
  email?: string | null
  /** `actor_type` / `target_type` — the class, used only as a last resort. */
  type?: string | null
  index: IdentityIndex
}

/**
 * Email as the primary label, with a click-through to the full identity.
 *
 * The drill-down is a popover rather than a tooltip so the values inside it
 * can be selected and copied — an operator chasing an incident needs the id,
 * not a glimpse of it.
 */
export function IdentityCell({ id, email, type, index }: IdentityCellProps) {
  const resolved = resolveIdentity(index, id, email)

  // Nothing at all: no id, no email. Say which class acted, plainly.
  if (!resolved && !id) {
    return <span className="text-muted-foreground">{type ?? "—"}</span>
  }

  const primary = resolved?.email ?? id ?? type ?? "—"
  const isUnresolvedId = !resolved?.email && Boolean(id)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="max-w-[240px] truncate text-left underline decoration-dotted underline-offset-2 hover:text-foreground"
          title="Show full identity"
        >
          <span className={isUnresolvedId ? "font-mono text-xs" : undefined}>{primary}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
          <p className="font-medium">
            {resolved?.fullName ?? (
              <span className="text-muted-foreground">
                {index.ready
                  ? "Not in the user roster — a system actor, a deleted user, or a target that is not a person."
                  : "Resolving…"}
              </span>
            )}
          </p>
        </div>

        {resolved?.email && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
            <p className="break-all">{resolved.email}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {resolved?.role && <Badge variant="secondary">{resolved.role}</Badge>}
          {resolved?.status && <Badge variant="outline">{resolved.status}</Badge>}
          {type && <Badge variant="outline">{type}</Badge>}
        </div>

        {id && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">ID</p>
            <p className="select-all break-all font-mono text-xs">{id}</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
