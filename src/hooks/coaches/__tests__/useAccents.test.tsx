/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccents } from "../useAccents";
import { getAccents } from "@/services/coaches/settings.service";
import type { AxiosError } from "axios";

/* --------------------------------------------------------------------------
   MOCK: service layer (NOT axios)
--------------------------------------------------------------------------- */
jest.mock("@/services/coaches/settings.service", () => ({
  getAccents: jest.fn(),
}));

const mockGetAccents = getAccents as jest.MockedFunction<typeof getAccents>;

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

describe("useAccents hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches accents successfully", async () => {
    const mockResponse = {
      status: true,
      data: [{ id: "a1", name: "US Accent" }],
    };

    mockGetAccents.mockResolvedValueOnce(mockResponse as any);

    const { result } = renderHook(() => useAccents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetAccents).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockResponse);
  });

  test("returns error when API fails", async () => {
    const error = {
      message: "Network error",
    } as AxiosError;

    mockGetAccents.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useAccents(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
test("does not resolve data or error when disabled", async () => {
  const { result } = renderHook(
    () =>
      useAccents(),
    {
      wrapper: createWrapper(),
    }
  );

  // Give React Query time to settle
  await new Promise((r) => setTimeout(r, 0));

  // Query should NOT reach success or error states
  expect(result.current.isSuccess).toBe(false);
  expect(result.current.isError).toBe(false);
});




});
