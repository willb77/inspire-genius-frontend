import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import {
  getUserEntitlements,
  grantVertical,
  revokeVertical,
} from "@/services/super-admin/vertical-entitlements/verticalEntitlementsAdmin.service";
import {
  prismAccessErrorMessage,
  useMyApproverStatus,
} from "@/hooks/super-admin/prism-access/usePrismAccessAdmin";
import {
  VERTICAL_ENTITLEMENTS_CAPABILITY,
  type EntitlementChange,
  type UserEntitlements,
} from "@/types/super-admin/vertical-entitlements";

type ApiError = AxiosError<{ detail?: unknown; message?: string }>;

const ROOT_KEY = ["super-admin", "vertical-entitlements"] as const;
const userKey = (id: string) => [...ROOT_KEY, "user", id] as const;

/** The server's message for a failed call (same reader as the PRISM controls). */
export const entitlementsErrorMessage = prismAccessErrorMessage;

/**
 * May I use the vertical entitlements controls? Reads the same approver status
 * as the PRISM controls (one request, one cache entry). False while loading or
 * failed — the control is simply not shown.
 */
export function useVerticalEntitlementsPermission(enabled: boolean): {
  canManageEntitlements: boolean;
} {
  const { data } = useMyApproverStatus(enabled);
  return {
    canManageEntitlements: !!data?.capabilities?.includes(VERTICAL_ENTITLEMENTS_CAPABILITY),
  };
}

export function useUserEntitlements(userId: string | null | undefined, enabled = true) {
  return useQuery<UserEntitlements, ApiError>({
    queryKey: userKey(userId ?? ""),
    queryFn: () => getUserEntitlements(userId as string),
    enabled: enabled && !!userId,
    // Other tools add verticals too: never show a cached answer.
    staleTime: 0,
    retry: false,
  });
}

type ChangeVars = { userId: string; vertical: string; title: string };

function useChange(
  fn: (userId: string, vertical: string) => Promise<EntitlementChange>,
  done: (r: EntitlementChange, title: string) => string,
  failed: string,
) {
  const queryClient = useQueryClient();
  return useMutation<EntitlementChange, ApiError, ChangeVars>({
    mutationFn: ({ userId, vertical }) => fn(userId, vertical),
    onSuccess: (result, { userId, title }) => {
      queryClient.setQueryData(userKey(userId), result.view);
      toast.success(done(result, title));
    },
    onError: (error, { userId }) => {
      toast.error(entitlementsErrorMessage(error, failed));
      queryClient.invalidateQueries({ queryKey: userKey(userId) });
    },
  });
}

export function useGrantVertical() {
  return useChange(
    grantVertical,
    (r, title) => (r.changed ? `${title} granted.` : `They already had ${title}.`),
    "Could not grant the vertical.",
  );
}

export function useRevokeVertical() {
  return useChange(
    revokeVertical,
    (r, title) => (r.changed ? `${title} revoked.` : `They did not have ${title}.`),
    "Could not revoke the vertical.",
  );
}
