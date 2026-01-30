/**
 * @jest-environment jsdom
 */

/* --------------------------------------------------------------------------
   IMPORTANT: Mock axios FIRST to avoid import.meta.env errors
--------------------------------------------------------------------------- */
jest.mock("@/lib/axios", () => ({
  api: {
    put: jest.fn(),
  },
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUpdatePreferences } from "../useUpdatePreferences";
import { updatePreferences } from "@/services/coaches/preferences.service";
import type { AxiosError } from "axios";

/* --------------------------------------------------------------------------
   MOCK: service layer
--------------------------------------------------------------------------- */
jest.mock("@/services/coaches/preferences.service", () => ({
  updatePreferences: jest.fn(),
}));

const mockUpdatePreferences =
  updatePreferences as jest.MockedFunction<typeof updatePreferences>;

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

describe("useUpdatePreferences hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("successfully updates preferences", async () => {
    const variables = {
      agentId: "agent-123",
      body: {
        tone_ids: ["t1", "t2"],
        accent_id: "a1",
        gender_id: "g1",
      },
    };

    const mockResponse = {
      status: true,
      message: "Preferences updated successfully",
    };

    mockUpdatePreferences.mockResolvedValueOnce(mockResponse as any);

    const { result } = renderHook(() => useUpdatePreferences(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(variables);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockUpdatePreferences).toHaveBeenCalledWith(
      variables.agentId,
      variables.body
    );
    expect(result.current.data).toEqual(mockResponse);
  });

  test("returns error when update fails", async () => {
    const variables = {
      agentId: "agent-123",
      body: {
        tone_ids: [],
        accent_id: "",
        gender_id: "",
      },
    };

    const error = {
      message: "Update failed",
    } as AxiosError;

    mockUpdatePreferences.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useUpdatePreferences(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(variables);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });
});
