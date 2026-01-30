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
import { useTones } from "../useTones";
import { getTones } from "@/services/coaches/settings.service";
import type { AxiosError } from "axios";

/* --------------------------------------------------------------------------
   MOCK: service layer (NOT axios)
--------------------------------------------------------------------------- */
jest.mock("@/services/coaches/settings.service", () => ({
  getTones: jest.fn(),
}));

const mockGetTones = getTones as jest.MockedFunction<typeof getTones>;

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

describe("useTones hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches tones successfully", async () => {
    const mockResponse = {
      status: true,
      data: {
        Tones: [{ id: "t1", name: "Calm" }],
      },
    };

    mockGetTones.mockResolvedValueOnce(mockResponse as any);

    const { result } = renderHook(() => useTones(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(mockGetTones).toHaveBeenCalled();
  });

  test("returns error when service fails", async () => {
    const error = {
      message: "Network error",
    } as AxiosError;

    mockGetTones.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useTones(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});
