/**
 * @jest-environment jsdom
 *
 * Test suite for the useResetPassword mutation hook.
 *
 * This hook:
 *  - Calls resetPassword API
 *  - Shows toast.success or toast.error based on response
 *  - Supports default and custom messages
 *  - Correctly handles Axios errors
 *  - Exposes react-query mutation states (isSuccess, isError, etc.)
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useResetPassword } from "../useResetPassword";
import {
  resetPassword,
  type ResetPasswordPayload,
  type ResetPasswordResponse,
} from "@/services/auth/password.service";

import { toast } from "sonner";
import type { AxiosError } from "axios";

// -------------------------------------------------------
// MOCK API + TOAST
// -------------------------------------------------------

// Mock API function
jest.mock("@/services/auth/password.service", () => ({
  resetPassword: jest.fn(),
}));

// Mock toast notifications
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

/**
 * Utility wrapper to provide React Query context
 */
function wrapper() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } }, // disable retry to avoid multiple triggers
  });

  return ({ children }: any) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

// Reusable payload
const payload: ResetPasswordPayload = {
  reset_token: "token",
  new_password: process.env.FAKE_TEST_VALID_PASSWORD as string,
  confirm_password: process.env.FAKE_TEST_VALID_PASSWORD as string,
};

describe("useResetPassword", () => {
  beforeEach(() => jest.clearAllMocks());

  // SUCCESS CASES

  test("shows success toast when status=true", async () => {
    // Mock API response with success + message
    const mockResponse: ResetPasswordResponse = {
      status: true,
      message: "Updated",
    };

    (resetPassword as jest.Mock).mockResolvedValueOnce(mockResponse);

    // Render hook
    const { result } = renderHook(() => useResetPassword(), {
      wrapper: wrapper(),
    });

    // Trigger mutation
    result.current.mutate(payload);

    // Wait until mutation reports success
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Ensure API and toast were called
    expect(resetPassword).toHaveBeenCalledWith(payload);
    expect(toast.success).toHaveBeenCalledWith("Updated");
  });

  test("shows default success message when no message provided", async () => {
    const mockResponse: ResetPasswordResponse = { status: true };

    (resetPassword as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: wrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Default fallback message
    expect(toast.success).toHaveBeenCalledWith("Password reset successful");
  });

  // FAILURE CASES (status = false)

  test("shows error toast when status=false with message", async () => {
    const mockResponse: ResetPasswordResponse = {
      status: false,
      message: "Invalid token",
    };

    (resetPassword as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: wrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Invalid token");
  });

  test("shows default error message when status=false and no message provided", async () => {
    const mockResponse: ResetPasswordResponse = { status: false };

    (resetPassword as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: wrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Password reset failed");
  });

  // ERROR CASES (Promise rejection)

  test("handles error with response.data.message", async () => {
    const mockError = {
      response: { data: { message: "Server says no" } },
      isAxiosError: true,
    } as AxiosError<{ message?: string }>;

    (resetPassword as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: wrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Uses response's message
    expect(toast.error).toHaveBeenCalledWith("Server says no");
  });

  test("handles error using error.message fallback", async () => {
    const mockError = {
      message: "Network error",
      isAxiosError: true,
    } as AxiosError;

    (resetPassword as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: wrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Network error");
  });

  test("shows default error message when no message exists anywhere", async () => {
    const mockError = {} as AxiosError;

    (resetPassword as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: wrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Reset failed");
  });
});
