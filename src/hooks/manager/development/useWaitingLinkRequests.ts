/**
 * Who may see member → manager join requests (MMLR-6), and how many wait.
 *
 * The server answers the incoming list for `manager` only, so the manager
 * audience held by someone with the manager role is the only caller that
 * makes the request. Everyone else gets "no" and 0 with no call made.
 */
import { useContext } from "react"
import { AuthContext } from "@/context/auth-context"
import { ROLES } from "@/constants/routes"
import { statusOf } from "@/components/sharing/linkRequestCopy"
import { useIncomingLinkRequests } from "@/hooks/summit/useLinkRequests"

export type StudioAudience = "manager" | "practitioner"

export function useCanSeeLinkRequests(audience: StudioAudience | undefined): boolean {
  const auth = useContext(AuthContext)
  return audience === "manager" && auth?.hasRole(ROLES.MANAGER) === true
}

/**
 * The number of requests waiting on this manager, for the Studio notice and
 * the dialog's tab badge. 0 for an empty list, a 403 / 404 and a failed first
 * read — the same rules the panel uses to decide it has nothing to show. A
 * failed refresh keeps the last list, so a waiting request never vanishes.
 * Needs a QueryClient: mount it only where `useCanSeeLinkRequests` is true.
 */
export function useWaitingLinkRequestCount(): number {
  const incoming = useIncomingLinkRequests(true)
  const refusedOutright = incoming.isError && [403, 404].includes(statusOf(incoming.error) ?? 0)
  if (refusedOutright) return 0
  return incoming.data?.length ?? 0
}
