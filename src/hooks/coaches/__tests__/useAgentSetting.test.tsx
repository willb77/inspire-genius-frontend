/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAgentSetting } from "../useAgentSetting";
import { getAgentSetting } from "@/services/coaches/settings.service";
import type { AxiosError } from "axios";

/* --------------------------------------------------------------------------
   MOCK: service layer (NOT axios)
--------------------------------------------------------------------------- */
jest.mock("@/services/coaches/settings.service", () => ({
  getAgentSetting: jest.fn(),
}));

const mockGetAgentSetting =
  getAgentSetting as jest.MockedFunction<typeof getAgentSetting>;

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

describe("useAgentSetting hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetches agent setting successfully for given segment", async () => {
    const segment = "tone";

    const mockResponse = {
      status: true,
      data: [{ id: "t1", name: "Calm" }],
    };

    mockGetAgentSetting.mockResolvedValueOnce(mockResponse as any);

    const { result } = renderHook(
      () => useAgentSetting(segment),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetAgentSetting).toHaveBeenCalledWith(segment);
    expect(result.current.data).toEqual(mockResponse);
  });

  test("returns error when service fails", async () => {
    const segment = "accent";

    const error = {
      message: "Network error",
    } as AxiosError;

    mockGetAgentSetting.mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useAgentSetting(segment),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });

  test("refetches when segment changes", async () => {
    mockGetAgentSetting
      .mockResolvedValueOnce({
        status: true,
        data: ["tone-data"],
      } as any)
      .mockResolvedValueOnce({
        status: true,
        data: ["accent-data"],
      } as any);

    const { result, rerender } = renderHook(
      ({ segment }) => useAgentSetting(segment),
      {
        initialProps: { segment: "tone" },
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.data).toEqual(["tone-data"]);

    // Change segment → new queryKey
    rerender({ segment: "accent" });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGetAgentSetting).toHaveBeenLastCalledWith("accent");
    expect(result.current.data?.data).toEqual(["accent-data"]);
  });
});
