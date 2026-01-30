/**
 * @jest-environment jsdom
 */

/* --------------------------------------------------------------------------
   IMPORTANT: Mock axios FIRST to avoid import.meta.env issues
--------------------------------------------------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    post: jest.fn(),
  },
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSavePreferences } from "../useSavePreferences";
import { savePreferences } from "@/services/coaches/preferences.service";
import type { AxiosError } from "axios";

/* --------------------------------------------------------------------------
   MOCK: service layer
--------------------------------------------------------------------------- */
jest.mock("@/services/coaches/preferences.service", () => ({
  savePreferences: jest.fn(),
}));

const mockSavePreferences =
  savePreferences as jest.MockedFunction<typeof savePreferences>;

/* --------------------------------------------------------------------------
   TEST WRAPPER
--------------------------------------------------------------------------- */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
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

describe("useSavePreferences hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("successfully saves preferences", async () => {
    const payload = {
      preferences: [
        {
          agent_id: "agent-1",
          tone_ids: ["t1"],
          accent_id: "a1",
          gender_id: "g1",
        },
      ],
    };

    const mockResponse = {
      status: true,
      message: "Preferences saved successfully",
    };

    mockSavePreferences.mockResolvedValueOnce(mockResponse as any);

    const { result } = renderHook(() => useSavePreferences(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(payload);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSavePreferences).toHaveBeenCalledWith(payload);
    expect(result.current.data).toEqual(mockResponse);
  });

  test("returns error when mutation fails", async () => {
    const payload = {
      preferences: [],
    };

    const error = {
      message: "Save failed",
    } as AxiosError;

    mockSavePreferences.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useSavePreferences(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(payload);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});
