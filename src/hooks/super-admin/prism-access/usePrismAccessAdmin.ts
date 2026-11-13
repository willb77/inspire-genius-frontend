import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import {
  addApprover,
  getMyApproverStatus,
  getOrgPrismAccess,
  getUserPrismAccess,
  grantUserPrismAccess,
  listApprovers,
  removeApprover,
  revokeUserPrismAccess,
  setOrgPrismAccess,
} from "@/services/super-admin/prism-access/prismAccessAdmin.service";
import {
  PRISM_SURVEY_ACCESS_CAPABILITY,
  type Approver,
  type ApproverList,
  type ApproverStatus,
  type OrgPrismAccess,
  type OrgPrismAccessChange,
  type UserPrismAccess,
  type UserPrismAccessChange,
} from "@/types/super-admin/prism-access";

type ApiError = AxiosError<{ detail?: unknown; message?: string }>;

const ROOT_KEY = ["super-admin", "prism-access"] as const;
const ME_KEY = [...ROOT_KEY, "me"] as const;
const APPROVERS_KEY = [...ROOT_KEY, "approvers"] as const;
const userKey = (id: string) => [...ROOT_KEY, "user", id] as const;
const orgKey = (id: string) => [...ROOT_KEY, "org", id] as const;

/** The server's message for a failed call, never "[object Object]". */
export function prismAccessErrorMessage(error: unknown, fallback: string): string {
  const data = (error as ApiError | undefined)?.response?.data;
  const detail = data?.detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    const msg = (detail as { message?: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
  }
  if (typeof detail === "string" && detail) return detail;
  if (typeof data?.message === "string" && data.message) return data.message;
  return fallback;
}

/**
 * Am I an approver (and am I the owner)? Off unless `enabled`. A failed read —
 * including the 403 a non-super-admin gets — is "no controls", never an error
 * on the page: these controls are simply not shown.
 */
export function useMyApproverStatus(enabled: boolean) {
  return useQuery<ApproverStatus, ApiError>({
    queryKey: ME_KEY,
    queryFn: getMyApproverStatus,
    enabled,
    staleTime: 60 * 1000,
    retry: false,
  });
}

/** Convenience: the two flags the pages need. Both false while loading or failed. */
export function usePrismAccessPermissions(enabled: boolean): {
  canManagePrismAccess: boolean;
  isOwner: boolean;
} {
  const { data } = useMyApproverStatus(enabled);
  return {
    canManagePrismAccess: !!data?.capabilities?.includes(PRISM_SURVEY_ACCESS_CAPABILITY),
    isOwner: data?.is_owner === true,
  };
}

export function useUserPrismAccess(userId: string | null | undefined, enabled = true) {
  return useQuery<UserPrismAccess, ApiError>({
    queryKey: userKey(userId ?? ""),
    queryFn: () => getUserPrismAccess(userId as string),
    enabled: enabled && !!userId,
    // Never trust a cached answer about who may request a survey.
    staleTime: 0,
    retry: false,
  });
}

function useUserChange(
  fn: (userId: string) => Promise<UserPrismAccessChange>,
  done: (r: UserPrismAccessChange) => string,
  failed: string,
) {
  const queryClient = useQueryClient();
  return useMutation<UserPrismAccessChange, ApiError, { userId: string }>({
    mutationFn: ({ userId }) => fn(userId),
    onSuccess: (result, { userId }) => {
      queryClient.setQueryData(userKey(userId), result.view);
      toast.success(done(result));
    },
    onError: (error, { userId }) => {
      toast.error(prismAccessErrorMessage(error, failed));
      queryClient.invalidateQueries({ queryKey: userKey(userId) });
    },
  });
}

export function useGrantUserPrismAccess() {
  return useUserChange(
    grantUserPrismAccess,
    (r) => (r.changed ? "PRISM survey access granted." : "They were already approved."),
    "Could not grant PRISM survey access.",
  );
}

export function useRevokeUserPrismAccess() {
  return useUserChange(
    revokeUserPrismAccess,
    (r) =>
      r.changed ? "Individual PRISM survey approval revoked." : "There was no approval to revoke.",
    "Could not revoke PRISM survey access.",
  );
}

export function useOrgPrismAccess(orgId: string | null | undefined, enabled = true) {
  return useQuery<OrgPrismAccess, ApiError>({
    queryKey: orgKey(orgId ?? ""),
    queryFn: () => getOrgPrismAccess(orgId as string),
    enabled: enabled && !!orgId,
    staleTime: 0,
    retry: false,
  });
}

export function useSetOrgPrismAccess() {
  const queryClient = useQueryClient();
  return useMutation<OrgPrismAccessChange, ApiError, { orgId: string; listed: boolean }>({
    mutationFn: ({ orgId, listed }) => setOrgPrismAccess(orgId, listed),
    onSuccess: (result, { orgId }) => {
      queryClient.setQueryData(orgKey(orgId), result.view);
      // Members' coverage may have changed with the org.
      queryClient.invalidateQueries({ queryKey: [...ROOT_KEY, "user"], exact: false });
      toast.success(
        result.listed
          ? "Members of this organisation may now request PRISM surveys."
          : "This organisation no longer authorises PRISM survey requests.",
      );
    },
    onError: (error, { orgId }) => {
      toast.error(prismAccessErrorMessage(error, "Could not change the organisation's access."));
      queryClient.invalidateQueries({ queryKey: orgKey(orgId) });
    },
  });
}

export function useApprovers(enabled: boolean) {
  return useQuery<ApproverList, ApiError>({
    queryKey: APPROVERS_KEY,
    queryFn: listApprovers,
    enabled,
    staleTime: 0,
    retry: false,
  });
}

export function useAddApprover() {
  const queryClient = useQueryClient();
  return useMutation<Approver, ApiError, { capability: string; email: string }>({
    mutationFn: addApprover,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVERS_KEY });
      toast.success("Approver added.");
    },
    onError: (error) => toast.error(prismAccessErrorMessage(error, "Could not add the approver.")),
  });
}

export function useRemoveApprover() {
  const queryClient = useQueryClient();
  return useMutation<{ id: string; removed: boolean }, ApiError, { id: string }>({
    mutationFn: ({ id }) => removeApprover(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVERS_KEY });
      toast.success("Approver removed.");
    },
    onError: (error) =>
      toast.error(prismAccessErrorMessage(error, "Could not remove the approver.")),
  });
}
