/**
 * @jest-environment jsdom
 *
 * Test suite for useResendOtpMutation.
 *
 * This mutation hook:
 *  - Reads the stored email using getEmail()
 *  - Calls resendVerificationApi(email) to resend OTP
 *  - Supports custom onSuccess and onError callbacks
 *  - Exposes mutation state (isSuccess, isError, etc.)
 *
 * These tests verify:
 *  - Correct API interaction
 *  - Proper handling of success and error cases
 *  - Execution of custom callbacks
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useResendOtpMutation } from "../useResendOtp";

import { getEmail } from "@/lib/storage";
import { resendVerificationApi } from "@/services/auth.service";
import type { AxiosError } from "axios";

// -----------------------------------------------------
// MOCKS
// -----------------------------------------------------

// Mock the helper that retrieves stored email
jest.mock("@/lib/storage", () => ({
  getEmail: jest.fn(),
}));

// Mock resend verification API
jest.mock("@/services/auth.service", () => ({
  resendVerificationApi: jest.fn(),
}));

/**
 * Utility to wrap hooks with React Query provider for testing.
 */
function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false }, // disable retries to avoid unwanted re-runs
    },
  });

  return ({ children }: any) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useResendOtpMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset mocks before each test
  });

  // SUCCESS CASE

  test("successfully resends OTP", async () => {
    // Mock email loading from storage
    (getEmail as jest.Mock).mockResolvedValueOnce("test@example.com");

    // Mock API returning success response
    const mockResponse = { status: true, message: "OTP Sent" };
    (resendVerificationApi as jest.Mock).mockResolvedValueOnce(mockResponse);

    // Render hook inside QueryClientProvider
    const { result } = renderHook(() => useResendOtpMutation(), {
      wrapper: createWrapper(),
    });

    // Trigger mutation (no variables needed)
    result.current.mutate();

    // Wait for mutation to succeed
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Validate correct behavior
    expect(getEmail).toHaveBeenCalled();
    expect(resendVerificationApi).toHaveBeenCalledWith("test@example.com");
    expect(result.current.data).toEqual(mockResponse);
  });

  // ERROR CASE

  test("handles error correctly", async () => {
    (getEmail as jest.Mock).mockResolvedValueOnce("test@example.com");

    // Mock API error response
    const mockError = {
      message: "Server error",
      isAxiosError: true,
    } as AxiosError;

    (resendVerificationApi as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useResendOtpMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    // Wait for error state to appear
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Confirm error object is passed correctly
    expect(result.current.error?.message).toBe("Server error");
  });

  // CUSTOM SUCCESS CALLBACK

  test("calls custom onSuccess callback", async () => {
    (getEmail as jest.Mock).mockResolvedValueOnce("me@example.com");

    const mockResponse = { status: true, message: "OTP sent" };
    (resendVerificationApi as jest.Mock).mockResolvedValueOnce(mockResponse);

    // Create a custom callback
    const onSuccessMock = jest.fn();

    // Hook with custom onSuccess
    const { result } = renderHook(
      () => useResendOtpMutation({ onSuccess: onSuccessMock }),
      { wrapper: createWrapper() }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Mutation callbacks always receive:
    // (data, variables, context)
    expect(onSuccessMock).toHaveBeenCalledWith(
      mockResponse,
      undefined,
      undefined
    );
  });

  // CUSTOM ERROR CALLBACK

  test("calls custom onError callback", async () => {
    (getEmail as jest.Mock).mockResolvedValueOnce("me@example.com");

    const mockError = {
      message: "Network error",
      isAxiosError: true,
    } as AxiosError;

    // Mock API failure
    (resendVerificationApi as jest.Mock).mockRejectedValueOnce(mockError);

    const onErrorMock = jest.fn();

    // Hook with custom error handler
    const { result } = renderHook(
      () => useResendOtpMutation({ onError: onErrorMock }),
      { wrapper: createWrapper() }
    );

    result.current.mutate();

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onErrorMock).toHaveBeenCalledWith(
      mockError,
      undefined,
      undefined
    );
  });
});
