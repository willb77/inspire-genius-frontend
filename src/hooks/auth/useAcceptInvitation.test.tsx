/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAcceptInvitation } from "./useAcceptInvitation";
import { acceptInvitation } from "@/services/auth/invitation.service";
import type { AxiosError } from "axios";
import { toast } from "sonner";

jest.mock("@/services/auth/invitation.service", () => ({
  acceptInvitation: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAcceptInvitation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("successfully accepts invitation with status true and shows success toast", async () => {
    const mockResponse = {
      status: true,
      message: "Invitation accepted successfully",
      data: { userId: 123 },
    };

    (acceptInvitation as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    const payload = {
      invitation_token: "invite-token-123",
      new_password: "password123",
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(acceptInvitation).toHaveBeenCalledWith(payload);
    expect(toast.success).toHaveBeenCalledWith("Invitation accepted successfully");
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("successfully accepts invitation with success true and shows success toast", async () => {
    const mockResponse = {
      success: true,
      message: "Welcome aboard!",
    };

    (acceptInvitation as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      invitation_token: "token-456",
      new_password: "pass456",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.success).toHaveBeenCalledWith("Welcome aboard!");
  });

  test("shows default success message when no message provided", async () => {
    const mockResponse = {
      status: true,
    };

    (acceptInvitation as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      invitation_token: "token-789",
      new_password: "pass789",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.success).toHaveBeenCalledWith("Invitation accepted");
  });

  test("shows error toast when status/success is false", async () => {
    const mockResponse = {
      status: false,
      message: "Invalid invitation token",
    };

    (acceptInvitation as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      invitation_token: "invalid-token",
      new_password: "test123",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Invalid invitation token");
    expect(toast.success).not.toHaveBeenCalled();
  });

  test("shows default error message when status is false and no message provided", async () => {
    const mockResponse = {
      status: false,
    };

    (acceptInvitation as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      invitation_token: "token",
      new_password: "pass",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Failed to accept invitation");
  });

  test("calls custom onSuccess callback only when status/success is true", async () => {
    const mockResponse = {
      status: true,
      message: "Success!",
    };

    (acceptInvitation as jest.Mock).mockResolvedValueOnce(mockResponse);

    const onSuccessMock = jest.fn();

    const { result } = renderHook(
      () => useAcceptInvitation({ onSuccess: onSuccessMock }),
      { wrapper: createWrapper() }
    );

    const payload = {
      invitation_token: "token",
      new_password: "pass",
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccessMock).toHaveBeenCalledWith(
      mockResponse,
      payload,
      undefined
    );
  });

  test("does not call custom onSuccess callback when status/success is false", async () => {
    const mockResponse = {
      status: false,
      message: "Failed",
    };

    (acceptInvitation as jest.Mock).mockResolvedValueOnce(mockResponse);

    const onSuccessMock = jest.fn();

    const { result } = renderHook(
      () => useAcceptInvitation({ onSuccess: onSuccessMock }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      invitation_token: "token",
      new_password: "pass",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccessMock).toHaveBeenCalled();
  });

  test("handles error with response data message", async () => {
    const mockError = {
      response: {
        status: 400,
        data: { message: "Token expired" },
      },
      message: "Request failed",
      isAxiosError: true,
    } as AxiosError<{ message?: string }>;

    (acceptInvitation as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      invitation_token: "expired-token",
      new_password: "pass",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Token expired");
  });

  test("handles error with error message fallback", async () => {
    const mockError = {
      message: "Network error",
      isAxiosError: true,
    } as AxiosError;

    (acceptInvitation as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      invitation_token: "token",
      new_password: "pass",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Network error");
  });

  test("handles error with default message", async () => {
    const mockError = {} as AxiosError;

    (acceptInvitation as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAcceptInvitation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      invitation_token: "token",
      new_password: "pass",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Failed to accept invitation");
  });

  test("calls custom onError callback", async () => {
    const mockError = {
      response: {
        status: 500,
        data: { message: "Server error" },
      },
      message: "Server error",
      isAxiosError: true,
    } as AxiosError<{ message?: string }>;

    (acceptInvitation as jest.Mock).mockRejectedValueOnce(mockError);

    const onErrorMock = jest.fn();

    const { result } = renderHook(
      () => useAcceptInvitation({ onError: onErrorMock }),
      { wrapper: createWrapper() }
    );

    const payload = {
      invitation_token: "token",
      new_password: "pass",
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onErrorMock).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("custom onError is called after toast error", async () => {
    const mockError = {
      message: "Custom error",
      isAxiosError: true,
    } as AxiosError;

    (acceptInvitation as jest.Mock).mockRejectedValueOnce(mockError);

    const callOrder: string[] = [];
    const onErrorMock = jest.fn(() => callOrder.push("onError"));
    (toast.error as jest.Mock).mockImplementation(() =>
      callOrder.push("toast.error")
    );

    const { result } = renderHook(
      () => useAcceptInvitation({ onError: onErrorMock }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      invitation_token: "token",
      new_password: "pass",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(callOrder).toEqual(["onError"]);
  });

  test("passes through other mutation options", async () => {
    const mockResponse = {
      status: true,
      message: "Success",
    };

    (acceptInvitation as jest.Mock).mockResolvedValueOnce(mockResponse);

    const onMutateMock = jest.fn();

    const { result } = renderHook(
      () => useAcceptInvitation({ onMutate: onMutateMock }),
      { wrapper: createWrapper() }
    );

    const payload = {
      invitation_token: "token",
      new_password: "pass",
    };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onMutateMock).toHaveBeenCalledWith(payload);
  });
});
