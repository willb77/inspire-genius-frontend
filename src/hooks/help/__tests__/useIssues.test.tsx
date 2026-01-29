/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { useIssues } from "@/hooks/help/useIssues";
import { getIssues } from "@/services/help/issues.service";

// --------------------
// Mocks
// --------------------
jest.mock("@/services/help/issues.service", () => ({
  getIssues: jest.fn(),
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

describe("useIssues", () => {
  const params = { page: 1, page_size: 10 };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------
  // SUCCESS CASE
  // --------------------
  it("calls getIssues with correct params and returns data", async () => {
    const mockResponse = {
      data: [],
      message: "Fetched successfully",
      meta: { total: 0 },
    };

    (getIssues as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () => useIssues(params),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getIssues).toHaveBeenCalledWith(params);
    expect(result.current.data).toEqual(mockResponse);
  });

  // --------------------
  // ERROR CASE
  // --------------------
  it("handles API error correctly", async () => {
    const error = {
      response: {
        data: { message: "Failed to fetch issues" },
      },
    } as AxiosError;

    (getIssues as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useIssues(params),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});
