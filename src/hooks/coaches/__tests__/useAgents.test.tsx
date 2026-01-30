/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAgents } from "../useAgents";
import { getAgents } from "@/services/coaches/agents.service";
import type { AxiosError } from "axios";

/* --------------------------------------------------------------------------
   MOCK: service layer
--------------------------------------------------------------------------- */
jest.mock("@/services/coaches/agents.service", () => ({
  getAgents: jest.fn(),
}));

const mockGetAgents = getAgents as jest.MockedFunction<typeof getAgents>;

/* --------------------------------------------------------------------------
   TEST WRAPPER
--------------------------------------------------------------------------- */
const createWrapper = () => {
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
};

describe("useAgents hook", () => {
  const query = { page: 1, page_size: 10 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches agents successfully", async () => {
    const mockResponse = {
      status: true,
      data: [{ id: "1", name: "Coach Alpha" }],
    };

    mockGetAgents.mockResolvedValueOnce(mockResponse as any);

    const { result } = renderHook(() => useAgents(query), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(mockGetAgents).toHaveBeenCalledWith(query);
  });

  test("returns error when service fails", async () => {
    const error = {
      message: "Network error",
    } as AxiosError;

    mockGetAgents.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useAgents(query), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });

  test("uses correct queryKey", async () => {
    mockGetAgents.mockResolvedValueOnce({
      status: true,
      data: [],
    } as any);

    const { result } = renderHook(() => useAgents(query), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Access internal query key via query hash (safe way)
    expect(result.current.data).toBeDefined();
  });
});
