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
} from "@/services/super-admin/user-management/user-management.service";
import type { BaseApiResponse } from "@/types/api";
import { toast } from "sonner";
import { logAuditEvent } from "@/services/audit/audit.service";
import { useAuth } from "@/context/useAuth";

/**
 * Resolve the calling super-admin's email for audit log attribution.
 * Replaces the hard-coded `'admin'` literal that previously made it
 * impossible to know who performed a destructive action (P0-1, 2026-05-13).
 */
function useActorEmail(): string {
  const { user } = useAuth();
  return user?.email ?? "admin";
}

type SimpleQueryOptions = Omit<
  UseQueryOptions<GetUsersResponse, AxiosError<BaseApiResponse<null>>>,
  "queryKey" | "queryFn"
>;

const QK = {
  list: (params: GetUsersParams) =>
    ["super-admin", "user-management", params] as const,
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
  const actorEmail = useActorEmail();

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
  const actorEmail = useActorEmail();

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
  const actorEmail = useActorEmail();

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
      logAuditEvent({ action: "user_role_changed", actor_email: actorEmail, target_type: "user", extra_data: { email: variables.email, role_id: variables.payload.role_id } });
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

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const actorEmail = useActorEmail();

  return useMutation<
    DeleteUserResponse,
    AxiosError<BaseApiResponse<null>>,
    string | { email: string; force?: boolean }
  >({
    mutationFn: (arg) => {
      if (typeof arg === "string") return deleteUserByEmail(arg);
      return deleteUserByEmail(arg.email, { force: arg.force });
    },

    onSuccess: (resp, arg) => {
      const email = typeof arg === "string" ? arg : arg.email;
      const forced = typeof arg === "object" && !!arg.force;
      toast.success(resp?.message);
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "user-management"],
        exact: false,
      });
      logAuditEvent({
        action: "user_deleted",
        actor_email: actorEmail,
        target_type: "user",
        extra_data: { email, forced },
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
  const actorEmail = useActorEmail();

  return useMutation<PurgeInactiveResult, AxiosError<BaseApiResponse<null>>>({
    mutationFn: () => purgeInactiveUsers(),

    onSuccess: (result) => {
      if (result.succeeded.length > 0 && result.failed.length === 0) {
        toast.success(
          `Purged ${result.succeeded.length} inactive user(s)`
        );
      } else if (result.succeeded.length > 0 && result.failed.length > 0) {
        toast.warning(
          `Purged ${result.succeeded.length} user(s), but ${result.failed.length} could not be removed`
        );
      } else if (result.total === 0) {
        toast.info("No inactive users found to purge");
      } else {
        toast.error("Failed to purge inactive users");
      }

      queryClient.invalidateQueries({
        queryKey: ["super-admin", "user-management"],
        exact: false,
      });

      logAuditEvent({
        action: "user_deleted",
        actor_email: actorEmail,
        target_type: "user",
        extra_data: {
          purged_count: result.succeeded.length,
          failed_count: result.failed.length,
          purge_inactive: true,
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
