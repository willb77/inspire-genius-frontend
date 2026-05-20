import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  getUsers,
  inviteUser,
  updateUserByEmail,
  deleteUserByEmail,
  resendInvitation,
  purgeInactiveUsers,
  getInactiveUserCount,
  changeUserRole,
  getUserInvitation,
  updateInvitationExpiry,
  type GetUsersParams,
  type GetUsersResponse,
  type InviteUserPayload,
  type UpdateUserPayload,
  type InviteUserResponse,
  type UpdateUserResponse,
  type DeleteUserResponse,
  type ResendInvitationResponse,
  type PurgeInactiveResult,
  type ChangeUserRolePayload,
  type ChangeUserRoleResponse,
  type InvitationDetails,
  type UpdateInvitationExpiryData,
} from "@/services/super-admin/user-management/user-management.service";
import type { BaseApiResponse } from "@/types/api";
import { toast } from "sonner";
import { logAuditEvent } from "@/services/audit/audit.service";
import { useAuth } from "@/context/useAuth";

type SimpleQueryOptions = Omit<
  UseQueryOptions<GetUsersResponse, AxiosError<BaseApiResponse<null>>>,
  "queryKey" | "queryFn"
>;

const QK = {
  list: (params: GetUsersParams) =>
    ["super-admin", "user-management", params] as const,
  invitation: (userId: string) =>
    ["super-admin", "user-management", "invitation", userId] as const,
};

export function useUserManagement(
  params: GetUsersParams,
  options?: SimpleQueryOptions
) {
  return useQuery<GetUsersResponse, AxiosError<BaseApiResponse<null>>>({
    queryKey: QK.list(params),
    queryFn: () => getUsers(params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const actorEmail = user?.email ?? "unknown";

  return useMutation<
    InviteUserResponse,
    AxiosError<BaseApiResponse<null>>,
    InviteUserPayload
  >({
    mutationFn: (payload) => inviteUser(payload),

    onSuccess: (resp, variables) => {
      toast.success(resp?.message);
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "user-management"],
        exact: false,
      });
      logAuditEvent({ action: "user_created", actor_email: actorEmail, target_type: "user", extra_data: { email: variables.email } });
    },

    onError: (error) => {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to invite user";
      toast.error(msg);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const actorEmail = user?.email ?? "unknown";

  return useMutation<
    UpdateUserResponse,
    AxiosError<BaseApiResponse<null>>,
    { email: string; payload: UpdateUserPayload }
  >({
    mutationFn: ({ email, payload }) => updateUserByEmail(email, payload),

    onSuccess: (resp, variables) => {
      toast.success(resp?.message);
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "user-management"],
        exact: false,
      });
      logAuditEvent({ action: "user_updated", actor_email: actorEmail, target_type: "user", extra_data: { email: variables.email } });
    },

    onError: (error) => {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to update user";
      toast.error(msg);
    },
  });
}

export function useChangeUserRole() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const actorEmail = user?.email ?? "unknown";

  return useMutation<
    ChangeUserRoleResponse,
    AxiosError<BaseApiResponse<null>>,
    { email: string; payload: ChangeUserRolePayload }
  >({
    mutationFn: ({ email, payload }) => changeUserRole(email, payload),

    onSuccess: (_resp, variables) => {
      toast.success("User role updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "user-management"],
        exact: false,
      });
      logAuditEvent({ action: "user_role_changed", actor_email: actorEmail, target_type: "user", extra_data: { email: variables.email, role: variables.payload.role } });
    },

    onError: (error) => {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to change user role";
      toast.error(msg);
    },
  });
}

export type DeleteUserVariables = { email: string; force?: boolean };

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const actorEmail = user?.email ?? "unknown";

  return useMutation<
    DeleteUserResponse,
    AxiosError<BaseApiResponse<null>>,
    DeleteUserVariables
  >({
    mutationFn: ({ email, force = false }) => deleteUserByEmail(email, force),

    onSuccess: (resp, vars) => {
      toast.success(resp?.message);
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "user-management"],
        exact: false,
      });
      logAuditEvent({
        action: "user_deleted",
        actor_email: actorEmail,
        target_type: "user",
        extra_data: { email: vars.email, force: vars.force ?? false },
      });
    },

    onError: (error) => {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete user";
      toast.error(msg);
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation<
    ResendInvitationResponse,
    AxiosError<BaseApiResponse<null>>,
    string
  >({
    mutationFn: (invitation_id) => resendInvitation(invitation_id),

    onSuccess: (resp) => {
      toast.success(resp?.message);
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "user-management"],
        exact: false,
      });
    },

    onError: (error) => {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to resend invitation";
      toast.error(msg);
    },
  });
}

/**
 * Fetch the latest invitation details for a single user. Disabled by default —
 * pass enabled=true only when the user has an invitation (invitation_id is
 * non-null and status is in {pending, expired}). 404 from the backend means
 * the user has no invitation on record and the hook surfaces it as an error.
 */
export function useUserInvitation(userId: string | null, enabled: boolean = false) {
  return useQuery<
    InvitationDetails,
    AxiosError<BaseApiResponse<null>>
  >({
    queryKey: QK.invitation(userId ?? ""),
    queryFn: () => getUserInvitation(userId!),
    enabled: Boolean(userId) && enabled,
    staleTime: 30 * 1000,
  });
}

export type UpdateInvitationExpiryVariables = {
  userId: string;
  expires_at: string;
};

export function useUpdateInvitationExpiry() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const actorEmail = user?.email ?? "unknown";

  return useMutation<
    UpdateInvitationExpiryData,
    AxiosError<BaseApiResponse<null>>,
    UpdateInvitationExpiryVariables
  >({
    mutationFn: ({ userId, expires_at }) =>
      updateInvitationExpiry(userId, expires_at),

    onSuccess: (data, variables) => {
      toast.success("Invitation expiry updated");
      // Refresh both the listing (so the row's invitation_status flips)
      // and the per-user invitation query (so the edit dialog re-renders).
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "user-management"],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: QK.invitation(variables.userId),
      });
      logAuditEvent({
        action: "invitation_expiry_updated",
        actor_email: actorEmail,
        target_type: "invitation",
        extra_data: {
          invitation_id: data.invitation_id,
          email: data.email,
          new_expires_at: data.expires_at,
        },
      });
    },

    onError: (error) => {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to update invitation expiry";
      toast.error(msg);
    },
  });
}

export function useInactiveUserCount(enabled = false) {
  return useQuery<number, AxiosError<BaseApiResponse<null>>>({
    queryKey: ["super-admin", "user-management", "inactive-count"],
    queryFn: () => getInactiveUserCount(),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function usePurgeInactiveUsers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const actorEmail = user?.email ?? "unknown";

  return useMutation<PurgeInactiveResult, AxiosError<BaseApiResponse<null>>>({
    mutationFn: () => purgeInactiveUsers(),

    onSuccess: (result) => {
      if (result.total === 0) {
        toast.info("No inactive users found to purge");
      } else if (result.failed.length === 0) {
        toast.success(
          `Purged ${result.succeeded.length} inactive user(s)`
        );
      } else if (result.succeeded.length > 0) {
        toast.warning(
          `Purged ${result.succeeded.length} user(s); ${result.failed.length} failed.`
        );
        // Per-user failure reasons are useful for triage but don't belong in a toast.
        console.warn("Purge failures:", result.failed);
      } else {
        toast.error(
          `Failed to purge inactive users (${result.failed.length} errors)`
        );
        console.warn("Purge failures:", result.failed);
      }

      queryClient.invalidateQueries({
        queryKey: ["super-admin", "user-management"],
        exact: false,
      });

      logAuditEvent({
        action: "users_bulk_purged",
        actor_email: actorEmail,
        target_type: "user",
        extra_data: {
          total: result.total,
          succeeded_count: result.succeeded.length,
          failed_count: result.failed.length,
        },
      });
    },

    onError: (error) => {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to purge inactive users";
      toast.error(msg);
    },
  });
}
