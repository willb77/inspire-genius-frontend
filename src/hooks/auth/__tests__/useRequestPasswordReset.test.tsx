/**
 * @jest-environment jsdom
 *
 * Test suite for the `useRequestPasswordReset` React Query mutation hook.
 *
 * This hook:
 *  - Calls `requestPasswordReset()` API to request a password reset email.
 *  - Displays toast notifications on success or error.
 *  - Supports optional `onSuccess` and `onError` callbacks passed by the user.
 *
 * These tests verify:
 *  - Correct API calls
 *  - Success handling (with both `status` and `success` flags)
 *  - Error handling (API error, network error, missing messages)
 *  - Custom callback execution
 *  - Toast messages for all paths
 */

import { renderHook, act } from "@testing-library/react";
import { useRequestPasswordReset } from "../useRequestPasswordReset";
import { requestPasswordReset } from "@/services/auth/password.service";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------
// MOCKS
// ---------------------------------------------------------

// Mock password service API
jest.mock("@/services/auth/password.service", () => ({
  requestPasswordReset: jest.fn(),
}));

// Mock toast notification system
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

/**
 * Creates a wrapper that injects React Query's QueryClientProvider.
 * Ensures React Query hooks work correctly in test environment.
 */
function createWrapper() {
  const queryClient = new QueryClient();
  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useRequestPasswordReset", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // reset mocks before every test
  });

  // SUCCESS CASES

  test("calls requestPasswordReset and triggers success toast", async () => {
    // Mock API returning success through `status: true`
    (requestPasswordReset as jest.Mock).mockResolvedValueOnce({
      status: true,
      message: "Email sent",
    });

    const { result } = renderHook(() => useRequestPasswordReset(), {
      wrapper: createWrapper(),
    });

    // Execute mutation
    await act(async () => {
      await result.current.mutateAsync({ email: "test@example.com" });
    });

    // Verify API call and toast success
    expect(requestPasswordReset).toHaveBeenCalledWith({ email: "test@example.com" });
    expect(toast.success).toHaveBeenCalledWith("Email sent");
  });

  test("handles success when 'success' field is true", async () => {
    // Mock API returning success through `success: true`
    (requestPasswordReset as jest.Mock).mockResolvedValueOnce({
      success: true,
      message: "Done",
    });

    const { result } = renderHook(() => useRequestPasswordReset(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: "abc@test.com" });
    });

    expect(toast.success).toHaveBeenCalledWith("Done");
  });

  // FAILURE CASES

  test("shows error toast when status is false", async () => {
    (requestPasswordReset as jest.Mock).mockResolvedValueOnce({
      status: false,
      message: "User not found",
    });

    const { result } = renderHook(() => useRequestPasswordReset(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: "x@test.com" });
    });

    expect(toast.error).toHaveBeenCalledWith("User not found");
  });

  // CUSTOM CALLBACKS

  test("calls user-provided onSuccess callback", async () => {
    const onSuccessMock = jest.fn();

    (requestPasswordReset as jest.Mock).mockResolvedValueOnce({
      status: true,
      message: "Link sent",
    });

    const { result } = renderHook(
      () => useRequestPasswordReset({ onSuccess: onSuccessMock }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync({ email: "test@mail.com" });
    });

    expect(onSuccessMock).toHaveBeenCalled();
  });

  // ERROR HANDLING

  test("handles API error and shows toast with API message", async () => {
    const error = {
      response: { data: { message: "Invalid email" } },
      message: "Network",
    };

    (requestPasswordReset as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useRequestPasswordReset(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: "bad@test.com" }).catch(() => {});
    });

    expect(toast.error).toHaveBeenCalledWith("Invalid email");
  });

  test("uses fallback error.message when response message is missing", async () => {
    const error = { message: "Server crash" };

    (requestPasswordReset as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useRequestPasswordReset(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ email: "bad@test.com" }).catch(() => {});
    });

    expect(toast.error).toHaveBeenCalledWith("Server crash");
  });

  test("calls user-provided onError callback", async () => {
    const onErrorMock = jest.fn();
    const error = { message: "Oops" };

    (requestPasswordReset as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useRequestPasswordReset({ onError: onErrorMock }),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.mutateAsync({ email: "bad@test.com" }).catch(() => {});
    });

    expect(onErrorMock).toHaveBeenCalledWith(error, { email: "bad@test.com" }, undefined);
  });
});
