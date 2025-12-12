/**
 * @jest-environment jsdom
 *
 * Tests for the `useSocialAuthLoginUrlMutation` hook.
 *
 * This hook:
 *  - Calls `getSocialAuthLoginUrl(provider)` to fetch a provider login URL.
 *  - Returns mutation states (isSuccess, isError, etc.).
 *  - Supports custom `onSuccess` and `onError` callbacks.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSocialAuthLoginUrlMutation } from "../useSocialAuthLoginUrl";

import { getSocialAuthLoginUrl } from "@/services/auth.service";
import type { ApiEnvelope } from "@/types/auth/api-types";
import type { AxiosError } from "axios";

// -------------------------------------------------------------
// Mock the social auth login API function
// -------------------------------------------------------------
jest.mock("@/services/auth.service", () => ({
  getSocialAuthLoginUrl: jest.fn(),
}));

/**
 * React Query wrapper so the mutation hook can function in tests.
 */
function wrapper() {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false }, // disable retry to avoid delays in tests
    },
  });

  return ({ children }: any) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useSocialAuthLoginUrlMutation", () => {
  beforeEach(() => jest.clearAllMocks());

  const provider = "Google";

  // Successful API response shape
  const mockSuccessResponse: ApiEnvelope<{ login_url: string }> = {
    status: true,
    message: "Success",
    data: { login_url: "https://google.com/login" },
  };

  // SUCCESS CASE — returns login_url when mutation succeeds
  test("mutates successfully and returns login_url", async () => {
    (getSocialAuthLoginUrl as jest.Mock).mockResolvedValueOnce(
      mockSuccessResponse
    );

    const { result } = renderHook(
      () => useSocialAuthLoginUrlMutation(),
      { wrapper: wrapper() }
    );

    // Trigger mutation
    result.current.mutate({ provider });

    // Wait for success state
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Ensure provider arg was passed correctly
    expect(getSocialAuthLoginUrl).toHaveBeenCalledWith(provider);

    // Hook returns the original API data
    expect(result.current.data).toEqual(mockSuccessResponse);
  });

  // CUSTOM onSuccess CALLBACK
  test("calls custom onSuccess handler", async () => {
    (getSocialAuthLoginUrl as jest.Mock).mockResolvedValueOnce(
      mockSuccessResponse
    );

    const onSuccessMock = jest.fn();

    const { result } = renderHook(
      () => useSocialAuthLoginUrlMutation({ onSuccess: onSuccessMock }),
      { wrapper: wrapper() }
    );

    result.current.mutate({ provider });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Custom callback should receive (data, variables, context)
    expect(onSuccessMock).toHaveBeenCalledWith(
      mockSuccessResponse,
      { provider },
      undefined
    );
  });

  // ERROR CASE — API rejects
  test("handles error correctly on failed mutation", async () => {
    const mockError: AxiosError<ApiEnvelope> = {
      isAxiosError: true,
      message: "Request failed",
    } as AxiosError<ApiEnvelope>;

    (getSocialAuthLoginUrl as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(
      () => useSocialAuthLoginUrlMutation(),
      { wrapper: wrapper() }
    );

    result.current.mutate({ provider });

    // Wait for error state
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Hook exposes error via mutation state
    expect(result.current.error?.message).toBe("Request failed");
  });

  // CUSTOM onError CALLBACK
  test("calls custom onError handler", async () => {
    const mockError: AxiosError<ApiEnvelope> = {
      isAxiosError: true,
      message: "OAuth Service Down",
    } as AxiosError<ApiEnvelope>;

    (getSocialAuthLoginUrl as jest.Mock).mockRejectedValueOnce(mockError);

    const onErrorMock = jest.fn();

    const { result } = renderHook(
      () => useSocialAuthLoginUrlMutation({ onError: onErrorMock }),
      { wrapper: wrapper() }
    );

    result.current.mutate({ provider });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Ensure custom error handler is called with correct args
    expect(onErrorMock).toHaveBeenCalledWith(
      mockError,
      { provider },
      undefined
    );
  });
});
