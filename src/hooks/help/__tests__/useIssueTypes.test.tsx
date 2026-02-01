/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AxiosError } from "axios";

import { useIssueTypes } from "@/hooks/help/useIssueTypes";
import { getIssueTypes } from "@/services/help/issues.service";

// --------------------
// Mocks
// --------------------
jest.mock("@/services/help/issues.service", () => ({
  getIssueTypes: jest.fn(),
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

describe("useIssueTypes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --------------------
  // SUCCESS CASE
  // --------------------
  it("calls getIssueTypes and returns data", async () => {
    const mockResponse = {
      data: [
        { id: 1, name: "Bug" },
        { id: 2, name: "Feature Request" },
      ],
    };

    (getIssueTypes as jest.Mock).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useIssueTypes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getIssueTypes).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockResponse);
  });

  // --------------------
  // ERROR CASE
  // --------------------
  it("handles API error correctly", async () => {
    const error = {
      response: {
        data: { message: "Failed to fetch issue types" },
      },
    } as AxiosError;

    (getIssueTypes as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useIssueTypes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});
