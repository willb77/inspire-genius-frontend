/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useResetPassword } from "./useResetPassword";
import {
  resetPassword,
  type ResetPasswordPayload,
  type ResetPasswordResponse,
} from "@/services/auth/password.service";

import { toast } from "sonner";
import type { AxiosError } from "axios";

// ---- MOCKS ----
jest.mock("@/services/auth/password.service", () => ({
  resetPassword: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return ({ children }: any) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const payload: ResetPasswordPayload = {
  reset_token: "token",
  new_password: "pass123",
  confirm_password: "pass123",
};

describe("useResetPassword", () => {
  beforeEach(() => jest.clearAllMocks());

  // -----------------------------------------------
  // SUCCESS CASES
  // -----------------------------------------------

  test("shows success toast when status=true", async () => {
    const mockResponse: ResetPasswordResponse = {
      status: true,
      message: "Updated",
    };

    (resetPassword as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: wrapper(),
    });

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(resetPassword).toHaveBeenCalledWith(payload);
    expect(toast.success).toHaveBeenCalledWith("Updated");
  });

  test("shows default success message when no msg", async () => {
    const mockResponse: ResetPasswordResponse = { status: true };

    (resetPassword as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: wrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.success).toHaveBeenCalledWith("Password reset successful");
  });

  // -----------------------------------------------
  // FAILURE CASES (status = false)
  // -----------------------------------------------

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

  test("shows default error message when status=false and no message", async () => {
    const mockResponse: ResetPasswordResponse = { status: false };

    (resetPassword as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useResetPassword(), {
      wrapper: wrapper(),
    });

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Password reset failed");
  });

  // -----------------------------------------------
  // ERROR CASES (Rejected Promise)
  // -----------------------------------------------

  test("handles error with response message", async () => {
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

    expect(toast.error).toHaveBeenCalledWith("Server says no");
  });

  test("handles error with error.message fallback", async () => {
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

  test("handles default error message when no message exists", async () => {
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