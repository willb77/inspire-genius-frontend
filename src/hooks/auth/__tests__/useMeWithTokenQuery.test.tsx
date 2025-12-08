/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMeWithTokenQuery } from "../useMeWithTokenQuery";
import { getMeWithToken } from "@/services/auth.service";

jest.mock("@/services/auth.service", () => ({
  getMeWithToken: jest.fn(),
}));

// React Query test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useMeWithTokenQuery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  test("fetches data when token is provided", async () => {
    (getMeWithToken as jest.Mock).mockResolvedValueOnce({
      status: true,
      data: { id: 123 },
    });

    const { result } = renderHook(() => useMeWithTokenQuery("valid-token"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(getMeWithToken).toHaveBeenCalledWith("valid-token");
    expect(result.current.data).toEqual({
      status: true,
      data: { id: 123 },
    });
  });

  test("does not run when enabledOverride is false", () => {
    renderHook(() => useMeWithTokenQuery("token-123", false), {
      wrapper: createWrapper(),
    });

    expect(getMeWithToken).not.toHaveBeenCalled();
  });

  test("runs when enabledOverride is true", async () => {
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

  test("returns error when service throws", async () => {
    const mockError = new Error("Invalid token");
    (getMeWithToken as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useMeWithTokenQuery("bad-token"), {
      wrapper: createWrapper(),
    });

    // Wait for loading to complete (either success or error)
    await waitFor(() => expect(result.current.isLoading).toBe(false), {
      timeout: 3000,
    });

    // Check the error state
    expect(result.current.isError).toBe(true);
    expect(getMeWithToken).toHaveBeenCalledWith("bad-token");
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe("Invalid token");
  });
});