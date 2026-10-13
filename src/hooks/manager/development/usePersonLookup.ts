import { useQuery } from "@tanstack/react-query"
import { getUsers } from "@/services/super-admin/user-management/user-management.service"
import { useOrgChart } from "./useOrgChart"
import { developmentKeys } from "./queryKeys"

/** One person the "Find a person" lookup can offer. */
export type PersonOption = {
  /** The account id (`users.user_id`) — sent as `memberSub`. */
  id: string
  name: string
  /** Present for the super-admin directory only; the org chart carries none. */
  email?: string
  title?: string | null
  department?: string | null
}

/** Searches shorter than this return nothing — a one-letter query is a list of everyone. */
export const LOOKUP_MIN_CHARS = 2
const LOOKUP_LIMIT = 10

/** Case-insensitive name match over the caller's own org chart. */
export function filterOrgChart(
  nodes: { id: string; name: string; title?: string | null; department?: string | null }[],
  query: string,
): PersonOption[] {
  const q = query.trim().toLowerCase()
  if (q.length < LOOKUP_MIN_CHARS) return []
  return nodes
    .filter((n) => n.name.toLowerCase().includes(q))
    .slice(0, LOOKUP_LIMIT)
    .map((n) => ({ id: n.id, name: n.name, title: n.title, department: n.department }))
}

/**
 * "Find a person" for the TDS Add-member dialog (T1).
 *
 * - A super-admin searches the platform directory
 *   (auth-service `GET /v1/user-management/users?search=`, super-admin only).
 * - Everyone else searches their OWN organisation's chart (growth
 *   `GET /org-chart`), filtered by name in the browser. It never reaches
 *   another organisation, and it carries no email addresses.
 *
 * Listing someone is not permission to add them: the server decides that
 * (only their manager, a company admin of their org or a super admin may).
 */
export function usePersonLookup(query: string, isSuperAdmin: boolean) {
  const q = query.trim()
  const searchable = q.length >= LOOKUP_MIN_CHARS

  const directory = useQuery({
    queryKey: [...developmentKeys.all, "person-lookup", q] as const,
    queryFn: async (): Promise<PersonOption[]> => {
      const res = await getUsers({ search: q, limit: LOOKUP_LIMIT })
      return (res?.data?.users ?? []).map((u) => ({
        id: u.user_id,
        name:
          u.full_name?.trim() ||
          [u.first_name, u.last_name].filter(Boolean).join(" ").trim() ||
          u.email,
        email: u.email,
      }))
    },
    enabled: isSuperAdmin && searchable,
    staleTime: 60_000,
  })

  const chart = useOrgChart({ enabled: !isSuperAdmin })

  if (isSuperAdmin) {
    return {
      results: searchable ? directory.data ?? [] : [],
      isLoading: searchable && directory.isLoading,
      isError: directory.isError,
    }
  }
  const viewerId = chart.data?.viewerId
  return {
    // Not yourself: a roster is the people you develop.
    results: filterOrgChart(
      (chart.data?.nodes ?? []).filter((n) => n.id !== viewerId),
      q,
    ),
    isLoading: chart.isLoading,
    isError: chart.isError,
  }
}
