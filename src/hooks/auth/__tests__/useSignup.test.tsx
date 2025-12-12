/**
 * @jest-environment jsdom
 *
 * Test suite for the `useAuthSignupMutation` hook.
 *
 * This hook wraps the signup API and returns:
 *  - mutation states (isSuccess, isError, etc.)
 *  - response data combined with submitted email/password
 *  - supports custom onSuccess and onError callbacks
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthSignupMutation } from "../useSignup";
import { signupApi } from "@/services/auth.service";
import type { ApiEnvelope, LoginDataPayload } from "@/types/auth/api-types";
import type { AxiosError } from "axios";

// -------------------------------------------------------
// MOCK: signupApi service
// -------------------------------------------------------
jest.mock("@/services/auth.service", () => ({
  signupApi: jest.fn(),
}));

/**
 * Creates a wrapper with React Query provider so the hook can run mutations.
 */
function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } }, // disable retries for predictable tests
  });
  return ({ children }: any) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useAuthSignupMutation", () => {
  beforeEach(() => jest.clearAllMocks());

  // Input variables used across tests
  const vars = {
    email: "test@example.com",
    password: "pass123",
    confirmPassword: "pass123",
  };

  // Mock success response from API
  const mockApiResponse: ApiEnvelope<LoginDataPayload> = {
    status: true,
    message: "Success",
    data: {
      access_token: "abc123",
      refresh_token: "xyz987",
      email: "test@example.com",
      user_id: "1",
    },
  };

  // SUCCESS CASE: Signup returns proper response
  test("calls signupApi with correct payload and returns expected data", async () => {
    (signupApi as jest.Mock).mockResolvedValueOnce(mockApiResponse);

    const { result } = renderHook(() => useAuthSignupMutation(), {
      wrapper: createWrapper(),
    });

    // Trigger mutation
    result.current.mutate(vars);

    // Wait for mutation success
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Ensure correct API payload was sent
    expect(signupApi).toHaveBeenCalledWith({
      email: vars.email,
      password: vars.password,
      confirm_password: vars.confirmPassword,
    });

    // Hook transforms output → returns original API response + form values
    expect(result.current.data).toEqual({
      data: mockApiResponse,
      email: vars.email,
      password: vars.password,
    });
  });

  // ERROR CASE: API rejects
  test("handles API error properly", async () => {
    const mockError = {
      message: "Signup failed",
      isAxiosError: true,
    } as AxiosError;

    (signupApi as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuthSignupMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(vars);

    // Wait for mutation to reach error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // The hook should expose the error object
    expect(result.current.error).toBe(mockError);
  });

  // CUSTOM onSuccess CALLBACK
  test("calls custom onSuccess callback", async () => {
    (signupApi as jest.Mock).mockResolvedValueOnce(mockApiResponse);

    const onSuccessMock = jest.fn();

    const { result } = renderHook(
      () => useAuthSignupMutation({ onSuccess: onSuccessMock }),
      { wrapper: createWrapper() }
    );

    result.current.mutate(vars);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The callback should be passed full transformed mutation data + variables
    expect(onSuccessMock).toHaveBeenCalledWith(
      {
        data: mockApiResponse,
        email: vars.email,
        password: vars.password,
      },
      vars,
      undefined
    );
  });

  // CUSTOM onError CALLBACK
  test("calls custom onError callback", async () => {
    const mockError = {
      message: "Server error",
      isAxiosError: true,
    } as AxiosError;

    (signupApi as jest.Mock).mockRejectedValueOnce(mockError);

    const onErrorMock = jest.fn();

    const { result } = renderHook(
      () => useAuthSignupMutation({ onError: onErrorMock }),
      { wrapper: createWrapper() }
    );

    result.current.mutate(vars);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(onErrorMock).toHaveBeenCalledWith(
      mockError,
      vars,
      undefined
    );
  });
});
