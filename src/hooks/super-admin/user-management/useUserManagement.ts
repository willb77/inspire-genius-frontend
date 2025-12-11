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
  type GetUsersParams,
  type GetUsersResponse,
  type InviteUserPayload,
  type UpdateUserPayload,
  type InviteUserResponse,
  type UpdateUserResponse,
  type DeleteUserResponse,
  type ResendInvitationResponse,
} from "@/services/super-admin/user-management/user-management.service";
import type { BaseApiResponse } from "@/types/api";
import { toast } from "sonner";

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
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
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
        "Failed to update user";
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
