/**
 * @jest-environment jsdom
 *
 * Test suite for the `useAuthLoginMutation` hook.
 * This hook wraps the `loginApi()` function using React Query's `useMutation`,
 * and returns metadata (loading/error/success states) and the final response.
 *
 * The tests cover:
 *  - successful login responses
 *  - API error handling (Axios errors)
 *  - forwarding of custom mutation callbacks (onSuccess, onError)
 *  - correct parameters passed to the API
 *  - mutation state transitions (idle → pending → success/error)
 *  - ability to reset mutation state
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthLoginMutation } from "../useLogin";
import { loginApi } from "@/services/auth.service";
import type { AxiosError } from "axios";

// Mock login API so real network requests are not made
jest.mock("@/services/auth.service", () => ({
  loginApi: jest.fn(),
}));

/**
 * Utility wrapper that provides a fresh QueryClient
 * for each test. This isolates React Query state.
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false, // avoid automatic retries interfering with tests
      },
    },
  });

  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useAuthLoginMutation", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // reset all mocks before each test
  });

  // SUCCESS CASES

  test("successfully logs in and returns data along with credentials", async () => {
    // Mock successful API response
    const mockResponse = {
      status: true,
      data: {
        token: "mock-jwt-token",
        user: { id: 1, email: "test@example.com", name: "Test User" },
      },
    };

    (loginApi as jest.Mock).mockResolvedValueOnce(mockResponse);

    // Render the hook
    const { result } = renderHook(() => useAuthLoginMutation(), {
      wrapper: createWrapper(),
    });

    const credentials = {
      email: "test@example.com",
      password: process.env.FAKE_TEST_VALID_PASSWORD as string,
    };

    // Trigger mutation
    result.current.mutate(credentials);

    // Wait until success is reported by React Query
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // API should be called with verification flag set to false
    expect(loginApi).toHaveBeenCalledWith({
      email: "test@example.com",
      password: process.env.FAKE_TEST_VALID_PASSWORD as string,
      verification: false,
    });

    // Hook should return response + input credentials
    expect(result.current.data).toEqual({
      data: mockResponse,
      email: "test@example.com",
      password: process.env.FAKE_TEST_VALID_PASSWORD as string,
    });
  });

  // ERROR HANDLING

  test("handles login error and exposes Axios error", async () => {
    const mockError = {
      response: { status: 401, data: { message: "Invalid credentials" } },
      isAxiosError: true,
    } as AxiosError;

    (loginApi as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuthLoginMutation(), {
      wrapper: createWrapper(),
    });

    // Trigger failed login
    result.current.mutate({
      email: "wrong@example.com",
      password: process.env.FAKE_TEST_VALID_PASSWORD as string,
    });

    // Wait until mutation is marked as error
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(loginApi).toHaveBeenCalledWith({
      email: "wrong@example.com",
      password: process.env.FAKE_TEST_VALID_PASSWORD as string,
      verification: false,
    });

    expect(result.current.error).toEqual(mockError);
  });

  // CUSTOM CALLBACK HANDLING

  test("accepts and calls custom onSuccess callback", async () => {
    const mockResponse = { status: true, data: { token: "token-123" } };

    (loginApi as jest.Mock).mockResolvedValueOnce(mockResponse);

    const onSuccessMock = jest.fn();
    const onErrorMock = jest.fn();

    const { result } = renderHook(
      () =>
        useAuthLoginMutation({
          onSuccess: onSuccessMock,
          onError: onErrorMock,
        }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      email: "user@test.com",
      password: process.env.FAKE_TEST_VALID_PASSWORD as string,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // onSuccess should be called with enriched mutation payload
    expect(onSuccessMock).toHaveBeenCalledWith(
      {
        data: mockResponse,
        email: "user@test.com",
        password: process.env.FAKE_TEST_VALID_PASSWORD as string,
      },
      { email: "user@test.com", password: process.env.FAKE_TEST_VALID_PASSWORD as string },
      undefined
    );

    expect(onErrorMock).not.toHaveBeenCalled();
  });

  test("calls custom onError callback when API rejects", async () => {
    const mockError = {
      response: { status: 500, data: { message: "Server error" } },
      isAxiosError: true,
    } as AxiosError;

    (loginApi as jest.Mock).mockRejectedValueOnce(mockError);

    const onErrorMock = jest.fn();
    const onSuccessMock = jest.fn();

    const { result } = renderHook(
      () =>
        useAuthLoginMutation({
          onError: onErrorMock,
          onSuccess: onSuccessMock,
        }),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      email: "fail@test.com",
      password: process.env.FAKE_TEST_VALID_PASSWORD as string,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Custom onError should receive error + variables
    expect(onErrorMock).toHaveBeenCalledWith(
      mockError,
      { email: "fail@test.com", password: process.env.FAKE_TEST_VALID_PASSWORD as string },
      undefined
    );

    expect(onSuccessMock).not.toHaveBeenCalled();
  });

  // API CALL FORMAT

  test("passes correct verification flag to loginApi", async () => {
    (loginApi as jest.Mock).mockResolvedValueOnce({
      status: true,
      data: { token: "verify-token" },
    });

    const { result } = renderHook(() => useAuthLoginMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      email: "verify@test.com",
      password: process.env.FAKE_TEST_VALID_PASSWORD as string,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Ensures API always receives verification:false
    expect(loginApi).toHaveBeenCalledWith({
      email: "verify@test.com",
      password: process.env.FAKE_TEST_VALID_PASSWORD as string,
      verification: false,
    });
  });

  // MUTATION STATE TESTS

  test("returns correct mutation states throughout lifecycle", async () => {
    // Mock slow response to test pending state
    (loginApi as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve({
          status: true,
          data: { token: "state-token" },
        }), 100))
    );

    const { result } = renderHook(() => useAuthLoginMutation(), {
      wrapper: createWrapper(),
    });

    // Initial state
    expect(result.current.isPending).toBe(false);
    expect(result.current.isIdle).toBe(true);

    result.current.mutate({
      email: "state@test.com",
      password: process.env.FAKE_TEST_VALID_PASSWORD as string,
    });

    // Should enter pending state
    await waitFor(() => expect(result.current.isPending).toBe(true));

    // Then eventually succeed
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
  });

  // RESET MUTATION

  test("mutation can be reset after completion", async () => {
    const mockResponse = { status: true, data: { token: "reset-token" } };

    (loginApi as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuthLoginMutation(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      email: "reset@test.com",
      password: process.env.FAKE_TEST_VALID_PASSWORD as string,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();

    // Reset mutation state back to idle
    result.current.reset();

    await waitFor(() => expect(result.current.isIdle).toBe(true));

    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });
});
