import { useQuery } from "@tanstack/react-query"

import { getUserActivity } from "@/services/audit/userActivity.service"

/**
 * Activity for one user. Disabled until a userId is supplied so opening the
 * dialog is what triggers the fetch, not rendering the row.
 *
 * `retry: false` — a 403 here means the caller is not super-admin/company-admin
 * and retrying will never change that; the dialog shows the error instead.
 */
export function useUserActivity(userId: string | null, limit = 20) {
  return useQuery({
    queryKey: ["audit", "user-activity", userId, limit],
    queryFn: () => getUserActivity(userId as string, limit),
    enabled: Boolean(userId),
    retry: false,
    staleTime: 30_000,
  })
}
