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
      logAuditEvent({ action: "user_created", actor_email: "admin", target_type: "user", extra_data: { email: variables.email } });
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
      logAuditEvent({ action: "user_updated", actor_email: "admin", target_type: "user", extra_data: { email: variables.email } });
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
      logAuditEvent({ action: "user_role_changed", actor_email: "admin", target_type: "user", extra_data: { email: variables.email, role_id: variables.payload.role_id } });
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

  return useMutation<
    DeleteUserResponse,
    AxiosError<BaseApiResponse<null>>,
    string
  >({
    mutationFn: (email) => deleteUserByEmail(email),

    onSuccess: (resp, email) => {
      toast.success(resp?.message);
      queryClient.invalidateQueries({
        queryKey: ["super-admin", "user-management"],
        exact: false,
      });
      logAuditEvent({ action: "user_deleted", actor_email: "admin", target_type: "user", extra_data: { email } });
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
        actor_email: "admin",
        target_type: "user",
        extra_data: {
          purged_count: result.succeeded.length,
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
