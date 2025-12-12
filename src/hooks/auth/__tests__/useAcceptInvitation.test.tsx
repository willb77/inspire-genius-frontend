/**
 * @jest-environment jsdom
 *
 * Test suite for the `useAcceptInvitation` React Query mutation hook.
 * Covers:
 *  - Success scenarios (status / success flags)
 *  - Error scenarios (API failures, Axios errors, missing messages)
 *  - Custom callback handling (onSuccess, onError, onMutate)
 *  - Toast notifications logic
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAcceptInvitation } from "../useAcceptInvitation";
import { acceptInvitation } from "@/services/auth/invitation.service";
import type { AxiosError } from "axios";
import { toast } from "sonner";

// Mock the invitation API function
jest.mock("@/services/auth/invitation.service", () => ({
  acceptInvitation: jest.fn(),
}));

// Mock toast notifications (success + error)
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

/**
 * Helper function to wrap hooks with a QueryClientProvider.
 * Ensures each test has its own isolated QueryClient instance.
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false }, // disable retries to simplify test flows
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

  // SUCCESS CASES

  test("successfully accepts invitation with status=true and shows success toast", async () => {
    // Mock API success response
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

    // Trigger mutation
    result.current.mutate(payload);

    // Wait until React Query marks mutation as successful
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(acceptInvitation).toHaveBeenCalledWith(payload);
    expect(toast.success).toHaveBeenCalledWith("Invitation accepted successfully");
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("successfully accepts invitation when success=true and shows success toast", async () => {
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

  test("shows default success message if no message is returned", async () => {
    (acceptInvitation as jest.Mock).mockResolvedValueOnce({ status: true });

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

  // FAILURE CASES (VALID API RESPONSE)

  test("shows error toast when API returns status/success = false", async () => {
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

  test("shows default error message when status=false and no message is returned", async () => {
    (acceptInvitation as jest.Mock).mockResolvedValueOnce({ status: false });

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

  // CUSTOM SUCCESS HANDLER

  test("calls custom onSuccess ONLY when success=true", async () => {
    const mockResponse = {
      status: true,
      message: "Success!",
    };

    const onSuccessMock = jest.fn();
    (acceptInvitation as jest.Mock).mockResolvedValueOnce(mockResponse);

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

  test("custom onSuccess still runs even when API success=false", async () => {
    const mockResponse = { status: false, message: "Failed" };

    const onSuccessMock = jest.fn();
    (acceptInvitation as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useAcceptInvitation({ onSuccess: onSuccessMock }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      invitation_token: "token",
      new_password: "pass",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccessMock).toHaveBeenCalled(); // hook always calls onSuccess
  });

  // AXIOS ERROR HANDLING

  test("uses server-provided message from Axios error", async () => {
    const mockError = {
      response: {
        status: 400,
        data: { message: "Token expired" },
      },
      message: "Request failed",
      isAxiosError: true,
    } as AxiosError;

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

  test("falls back to error.message when AxiosError has no data.message", async () => {
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

  test("falls back to default message when error contains no information", async () => {
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

  // CUSTOM onError CALLBACK

  test("calls custom onError callback on failure", async () => {
    const mockError = {
      response: { status: 500, data: { message: "Server error" } },
      message: "Server error",
      isAxiosError: true,
    } as AxiosError;

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
    expect(toast.error).not.toHaveBeenCalled(); // custom handler overrides toast
  });

  test("custom onError executes WITHOUT triggering toast.error", async () => {
    const mockError = {
      message: "Custom error",
      isAxiosError: true,
    } as AxiosError;

    (acceptInvitation as jest.Mock).mockRejectedValueOnce(mockError);

    const callOrder: string[] = [];
    const onErrorMock = jest.fn(() => callOrder.push("onError"));

    // Track toast.error call ordering
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

    expect(callOrder).toEqual(["onError"]); // custom handler takes priority
  });

  // Forwards other mutation options correctly

  test("forwards onMutate callback", async () => {
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
