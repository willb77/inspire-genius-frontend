import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import {
  getUsers,
  inviteUser,
  updateUserByEmail,
  deleteUserByEmail,
  resendInvitation,
  type GetUsersParams,
  type GetUsersResponse,
  type InviteUserPayload,
  type UpdateUserPayload,
} from "@/services/super-admin/user-management/user-management.service";
import { toast } from "sonner";

/**
 * Fetch all users
 */
export function useUserManagement(
  params: GetUsersParams,
  options?: UseQueryOptions<GetUsersResponse, AxiosError>
) {
  return useQuery<GetUsersResponse, AxiosError>({
    queryKey: ["user-management", params],
    queryFn: () => getUsers(params),
    ...options,
  });
}

/**
 * Invite user mutation
 */
export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InviteUserPayload) => inviteUser(payload),
    onSuccess: (resp) => {
      toast.success(resp?.message ?? "User invitation sent successfully.");
      queryClient.invalidateQueries({ queryKey: ["user-management"], exact: false });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? error?.message ?? "Failed to invite user";
      toast.error(msg);
    },
  });
}

/**
 * Update user mutation
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { email: string; payload: UpdateUserPayload }) =>
      updateUserByEmail(vars.email, vars.payload),
    onSuccess: (resp) => {
      toast.success(resp?.message ?? "User updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["user-management"], exact: false });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? error?.message ?? "Failed to update user";
      toast.error(msg);
    },
  });
}

/**
 * Delete user mutation
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => deleteUserByEmail(email),
    onSuccess: (resp) => {
      toast.success(resp?.message ?? "User deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["user-management"], exact: false });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? error?.message ?? "Failed to delete user";
      toast.error(msg);
    },
  });
}

/**
 * Resend invitation mutation
 */
export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitation_id: string) => resendInvitation(invitation_id),
    onSuccess: (resp) => {
      toast.success(resp?.message ?? "Invitation resent successfully.");
      queryClient.invalidateQueries({ queryKey: ["user-management"], exact: false });
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message ?? error?.message ?? "Failed to resend invitation";
      toast.error(msg);
    },
  });
}
