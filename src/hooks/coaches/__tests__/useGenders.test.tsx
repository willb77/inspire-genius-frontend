/**
 * @jest-environment jsdom
 */

/* --------------------------------------------------------------------------
   IMPORTANT: Mock axios FIRST to avoid import.meta.env errors
--------------------------------------------------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
  },
}));

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGenders } from "../useGenders";
import { getGenders } from "@/services/coaches/settings.service";
import type { AxiosError } from "axios";

/* --------------------------------------------------------------------------
   MOCK: service layer (NOT axios)
--------------------------------------------------------------------------- */
jest.mock("@/services/coaches/settings.service", () => ({
  getGenders: jest.fn(),
}));

const mockGetGenders = getGenders as jest.MockedFunction<typeof getGenders>;

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

describe("useGenders hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches genders successfully", async () => {
    const mockResponse = {
      status: true,
      data: {
        Genders: [{ id: "g1", name: "Male" }],
      },
    };

    mockGetGenders.mockResolvedValueOnce(mockResponse as any);

    const { result } = renderHook(() => useGenders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(mockGetGenders).toHaveBeenCalled();
  });

  test("returns error when service fails", async () => {
    const error = {
      message: "Network error",
    } as AxiosError;

    mockGetGenders.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useGenders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});
