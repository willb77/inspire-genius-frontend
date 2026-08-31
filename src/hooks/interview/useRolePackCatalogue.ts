/**
 * useRolePackCatalogue — React Query hook for the curated role+level packs.
 *
 * Metadata only (titles, levels, counts) — never question text, which stays
 * server-side until the candidate picks a pack.
 *
 * The service fails open to an empty list, and that is load-bearing rather than
 * defensive: the frontend deploys to dev AND staging-b on merge while the
 * agent-engine reaches staging-b only on a release tag, so this route is
 * guaranteed to be absent on one tier for a window. An empty catalogue means
 * the picker does not render at all and the form behaves exactly as it did
 * before role packs existed.
 */
import { useQuery } from "@tanstack/react-query"

import {
  getRolePackCatalogue,
  type RolePackCatalogue,
} from "@/services/interview/practice.service"

export function useRolePackCatalogue(params?: { enabled?: boolean }) {
  return useQuery<RolePackCatalogue>({
    queryKey: ["interview", "role-packs"],
    queryFn: getRolePackCatalogue,
    enabled: params?.enabled ?? true,
    // The pack dataset ships with the image — it only changes on deploy.
    staleTime: 1000 * 60 * 60,
    retry: false,
  })
}
