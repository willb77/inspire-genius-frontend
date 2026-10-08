import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import {
  assignUserToOrg,
  getOrgDirectory,
  removeUserFromOrg,
  type OrgDirectoryItem,
} from "@/services/super-admin/user-management/org-assignment.service";

const ORG_DIRECTORY_KEY = ["super-admin", "org-directory"] as const;

/** The organisations a super-admin can assign. Off unless `enabled`. */
export function useOrgDirectory(enabled: boolean) {
  return useQuery<OrgDirectoryItem[], AxiosError>({
    queryKey: ORG_DIRECTORY_KEY,
    queryFn: getOrgDirectory,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export type OrgChange = {
  userId: string;
  /** The org the user is in now, or null. */
  fromOrgId: string | null;
  /** The org to put them in, or null to clear it. */
  toOrgId: string | null;
};

/** Assign, move or clear a user's organisation; refreshes the user list. */
export function useChangeUserOrg() {
  const queryClient = useQueryClient();
  return useMutation<unknown, AxiosError<{ detail?: string; message?: string }>, OrgChange>({
    mutationFn: async ({ userId, fromOrgId, toOrgId }) => {
      if (toOrgId) return assignUserToOrg(toOrgId, userId);
      if (fromOrgId) return removeUserFromOrg(fromOrgId, userId);
      // Neither side names an org: there is nothing to write. Saying
      // "updated" here would report a change that never happened.
      throw new Error("Current organization unknown; nothing to change");
    },
    onSuccess: () => {
      toast.success("Organisation updated");
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "user-management"],
        exact: false,
      });
    },
    onError: (error) => {
      const data = error.response?.data;
      toast.error(data?.detail || data?.message || error.message || "Failed to update organisation");
    },
  });
}

/**
 * A change needs explicit confirmation when it takes the user OUT of an
 * organisation they are in now (a move or a clear). A first assignment does
 * not. An unknown current org counts as "in one" — the safe reading.
 */
export function needsMoveConfirmation(
  fromOrgId: string | null | undefined,
  toOrgId: string | null,
): boolean {
  if (fromOrgId === undefined) return true;
  if (fromOrgId === null) return false;
  return fromOrgId !== toOrgId;
}
