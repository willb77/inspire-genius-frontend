/* -----------------------------------------
   MOCK AXIOS (VITE import.meta FIX)
----------------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

/* -----------------------------------------
   MOCK SERVICES
----------------------------------------- */
jest.mock("@/services/super-admin/user-management/user-management.service");

/* -----------------------------------------
   MOCK TOAST
----------------------------------------- */
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  useUserManagement,
  useInviteUser,
  useUpdateUser,
  useDeleteUser,
  useResendInvitation,
} from "../useUserManagement";

import * as service from "@/services/super-admin/user-management/user-management.service";
import type {
  InviteUserPayload,
  UpdateUserPayload,
} from "@/services/super-admin/user-management/user-management.service";

/* -----------------------------------------
   HELPERS
----------------------------------------- */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const axiosErrorWithResponse = (message: string) =>
  ({
    response: {
      data: { message },
    },
  } as any);

/* -----------------------------------------
   TESTS
----------------------------------------- */
describe("useUserManagement Hooks", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /* -----------------------------------------
     QUERY: useUserManagement
  ----------------------------------------- */
  it("should fetch users successfully", async () => {
    const response = {
      message: "Users fetched",
      data: {
        users: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          has_more: false,
        },
        filters_applied: {},
      },
    };

    (service.getUsers as jest.Mock).mockResolvedValueOnce(response);

    const { result } = renderHook(
      () => useUserManagement({ page: 1, limit: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(service.getUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
    expect(result.current.data).toEqual(response);
  });

  /* -----------------------------------------
     MUTATION: useInviteUser
  ----------------------------------------- */
  it("should invite user successfully", async () => {
    (service.inviteUser as jest.Mock).mockResolvedValueOnce({
      message: "Invitation sent",
      data: {},
    });

    const { result } = renderHook(() => useInviteUser(), {
      wrapper: createWrapper(),
    });

    const payload: InviteUserPayload = {
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
    };

    await act(async () => {
      await result.current.mutateAsync(payload);
    });

    expect(toast.success).toHaveBeenCalledWith("Invitation sent");
  });

  it("invite error → response message", async () => {
    (service.inviteUser as jest.Mock).mockRejectedValueOnce(
      axiosErrorWithResponse("Invite failed")
    );

    const { result } = renderHook(() => useInviteUser(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          email: "x@test.com",
          first_name: "X",
          last_name: "Y",
        });
      } catch {}
    });

    expect(toast.error).toHaveBeenCalledWith("Invite failed");
  });

  it("invite error → error.message fallback", async () => {
    (service.inviteUser as jest.Mock).mockRejectedValueOnce({
      message: "Network error",
    });

    const { result } = renderHook(() => useInviteUser(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          email: "x@test.com",
          first_name: "X",
          last_name: "Y",
        });
      } catch {}
    });

    expect(toast.error).toHaveBeenCalledWith("Network error");
  });

  it("invite error → default fallback", async () => {
    (service.inviteUser as jest.Mock).mockRejectedValueOnce({});

    const { result } = renderHook(() => useInviteUser(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          email: "x@test.com",
          first_name: "X",
          last_name: "Y",
        });
      } catch {}
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to invite user");
  });

  /* -----------------------------------------
     MUTATION: useUpdateUser
  ----------------------------------------- */
  it("should update user successfully", async () => {
    (service.updateUserByEmail as jest.Mock).mockResolvedValueOnce({
      message: "User updated",
      data: {},
    });

    const { result } = renderHook(() => useUpdateUser(), {
      wrapper: createWrapper(),
    });

    const payload: UpdateUserPayload = {
      first_name: "A",
      last_name: "B",
    };

    await act(async () => {
      await result.current.mutateAsync({
        email: "test@example.com",
        payload,
      });
    });

    expect(toast.success).toHaveBeenCalledWith("User updated");
  });

  it("update error → default fallback", async () => {
    (service.updateUserByEmail as jest.Mock).mockRejectedValueOnce({});

    const { result } = renderHook(() => useUpdateUser(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({
          email: "test@example.com",
          payload: { first_name: "A", last_name: "B" },
        });
      } catch {}
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to update user");
  });

  /* -----------------------------------------
     MUTATION: useDeleteUser
  ----------------------------------------- */
  it("should delete user successfully", async () => {
    (service.deleteUserByEmail as jest.Mock).mockResolvedValueOnce({
      message: "User deleted",
      data: {},
    });

    const { result } = renderHook(() => useDeleteUser(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("test@example.com");
    });

    expect(toast.success).toHaveBeenCalledWith("User deleted");
  });

  it("delete error → default fallback", async () => {
    (service.deleteUserByEmail as jest.Mock).mockRejectedValueOnce({});

    const { result } = renderHook(() => useDeleteUser(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync("test@example.com");
      } catch {}
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to delete user");
  });

  /* -----------------------------------------
     MUTATION: useResendInvitation
  ----------------------------------------- */
  it("should resend invitation successfully", async () => {
    (service.resendInvitation as jest.Mock).mockResolvedValueOnce({
      message: "Invitation resent",
      data: {},
    });

    const { result } = renderHook(() => useResendInvitation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("inv-id");
    });

    expect(toast.success).toHaveBeenCalledWith("Invitation resent");
  });

  it("resend error → default fallback", async () => {
    (service.resendInvitation as jest.Mock).mockRejectedValueOnce({});

    const { result } = renderHook(() => useResendInvitation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync("inv-id");
      } catch {}
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to resend invitation");
  });
});
