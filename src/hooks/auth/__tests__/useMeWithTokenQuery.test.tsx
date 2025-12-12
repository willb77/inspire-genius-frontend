/**
 * @jest-environment jsdom
 *
 * Test suite for the `useMeWithTokenQuery` hook.
 * 
 * This hook:
 *  - Fetches authenticated user details using a provided token.
 *  - Calls the `getMeWithToken()` service only when a valid token is provided.
 *  - Supports an explicit `enabledOverride` flag to force-enable or disable the query.
 * 
 * These tests cover:
 *  - Conditional query execution based on token presence
 *  - Proper API invocation when token is valid
 *  - Custom enable/disable logic
 *  - Success and error states from React Query
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMeWithTokenQuery } from "../useMeWithTokenQuery";
import { getMeWithToken } from "@/services/auth.service";

// Mock the API service so queries do not hit the real backend
jest.mock("@/services/auth.service", () => ({
  getMeWithToken: jest.fn(),
}));

/**
 * Utility wrapper to provide React Query context for tests.
 * Ensures each test runs with a fresh QueryClient instance.
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // avoid auto-retry interfering with tests
      },
    },
  });

  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useMeWithTokenQuery", () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset mocks for each test
  });

  // TOKEN-BASED ENABLE/DISABLE BEHAVIOR

  test("does not run query when token is null", () => {
    renderHook(() => useMeWithTokenQuery(null), {
      wrapper: createWrapper(),
    });

    expect(getMeWithToken).not.toHaveBeenCalled();
  });

  test("does not run query when token is undefined", () => {
    renderHook(() => useMeWithTokenQuery(undefined), {
      wrapper: createWrapper(),
    });

    expect(getMeWithToken).not.toHaveBeenCalled();
  });

  // SUCCESS CASE

  test("fetches data when a valid token is provided", async () => {
    (getMeWithToken as jest.Mock).mockResolvedValueOnce({
      status: true,
      data: { id: 123 },
    });

    const { result } = renderHook(() => useMeWithTokenQuery("valid-token"), {
      wrapper: createWrapper(),
    });

    // Wait for query to complete successfully
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMeWithToken).toHaveBeenCalledWith("valid-token");
    expect(result.current.data).toEqual({
      status: true,
      data: { id: 123 },
    });
  });

  // ENABLE OVERRIDE LOGIC

  test("does not run when enabledOverride is false", () => {
    renderHook(() => useMeWithTokenQuery("token-123", false), {
      wrapper: createWrapper(),
    });

    expect(getMeWithToken).not.toHaveBeenCalled();
  });

  test("runs query when enabledOverride is true", async () => {
    (getMeWithToken as jest.Mock).mockResolvedValueOnce({
      status: true,
      data: { name: "John" },
    });

    const { result } = renderHook(
      () => useMeWithTokenQuery("abc-token", true),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMeWithToken).toHaveBeenCalledWith("abc-token");
  });

  // ERROR HANDLING CASE

  test("returns error when API throws", async () => {
    const mockError = new Error("Invalid token");
    (getMeWithToken as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useMeWithTokenQuery("bad-token"), {
      wrapper: createWrapper(),
    });

    // Wait until React Query finishes loading (either success or error)
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 3000,
    });

    // Error state must be true
    expect(result.current.isError).toBe(true);

    // API must have been called with the provided token
    expect(getMeWithToken).toHaveBeenCalledWith("bad-token");

    // Error object must match the thrown error
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe("Invalid token");
  });
});
