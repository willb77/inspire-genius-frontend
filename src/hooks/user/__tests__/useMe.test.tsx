/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { useMe } from "@/hooks/user/useMe";
import { getMe } from "@/services/user/me.service";

// --------------------
// Mocks
// --------------------
jest.mock("@/services/user/me.service", () => ({
  getMe: jest.fn(),
}));

// --------------------
// Query Wrapper
// --------------------
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe("useMe", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------
  // SUCCESS CASE
  // --------------------
  it("calls getMe and returns data", async () => {
    const mockResponse = {
      data: {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
      },
      message: "User fetched successfully",
    };

    (getMe as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useMe(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getMe).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockResponse);
  });

  // --------------------
  // SUCCESS CASE WITH GENERIC TYPE
  // --------------------
  it("calls getMe with generic type and returns typed data", async () => {
    interface CustomUser {
      userId: number;
      username: string;
    }

    const mockResponse = {
      data: {
        userId: 123,
        username: "testuser",
      },
      message: "Success",
    };

    (getMe as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useMe<CustomUser>(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getMe).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockResponse);
  });

  // --------------------
  // ERROR CASE
  // --------------------
  it("handles API error correctly", async () => {
    const error = {
      response: {
        data: { message: "Unauthorized" },
        status: 401,
      },
    } as AxiosError;

    (getMe as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useMe(),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });

  // --------------------
  // CUSTOM OPTIONS
  // --------------------
  it("accepts custom query options", async () => {
    const mockResponse = {
      data: { id: 1, name: "Test User" },
      message: "Success",
    };

    (getMe as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useMe({ 
        queryKey: ['me'],
        queryFn: () => getMe(),
        enabled: false 
      } as any),
      { wrapper: createWrapper() }
    );

    // Should not fetch when enabled is false
    expect(result.current.isFetching).toBe(false);
    expect(getMe).not.toHaveBeenCalled();
  });

  // --------------------
  // STALE TIME OPTION
  // --------------------
  it("respects custom staleTime option", async () => {
    const mockResponse = {
      data: { id: 1, name: "Test User" },
      message: "Success",
    };

    (getMe as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useMe({ 
        queryKey: ['me'],
        queryFn: () => getMe(),
        staleTime: 5000 
      } as any),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getMe).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockResponse);
  });
});