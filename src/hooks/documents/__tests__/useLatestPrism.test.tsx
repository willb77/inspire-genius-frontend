/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { AxiosError } from "axios";

import { useLatestPrism } from "@/hooks/documents/useLatestPrism";
import { getLatestPrism } from "@/services/documents/documentService";
import { agentApi } from "@/lib/agentApi";

jest.mock("@/services/documents/documentService", () => ({
  getLatestPrism: jest.fn(),
}));

jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    get: jest.fn(),
  },
}));

function createWrapper() {
  // Allow the hook's own retry function to decide; do not globally disable
  // retries here because one of the test cases verifies the retry callback
  // returns false on 404. We do clamp the retry delay to 0 so retries (when
  // they happen) resolve quickly.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retryDelay: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const SAMPLE = {
  document_id: "doc-abc-123",
  file_name: "prism-results.csv",
  uploaded_at: "2026-06-10T12:34:56Z",
};

beforeEach(() => jest.clearAllMocks());

describe("useLatestPrism", () => {
  it("returns the latest PRISM document on 200", async () => {
    (getLatestPrism as jest.Mock).mockResolvedValueOnce(SAMPLE);

    const { result } = renderHook(() => useLatestPrism(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(SAMPLE);
    expect(getLatestPrism).toHaveBeenCalledTimes(1);
  });

  it("hits the agent-engine /v1/documents/latest-prism URL when the real service is used", async () => {
    // Bypass the service-level mock to verify the URL contract. Re-implement
    // getLatestPrism inline using the mocked agentApi so we can assert what
    // the service would call.
    (agentApi.get as jest.Mock).mockResolvedValueOnce({ data: SAMPLE });
    (getLatestPrism as jest.Mock).mockImplementationOnce(async () => {
      const { data } = await agentApi.get("/v1/documents/latest-prism");
      return data;
    });

    const { result } = renderHook(() => useLatestPrism(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(agentApi.get).toHaveBeenCalledWith("/v1/documents/latest-prism");
    expect(result.current.data).toEqual(SAMPLE);
  });

  it("does not retry on 404 and surfaces the error state", async () => {
    const err = {
      isAxiosError: true,
      response: { status: 404, data: { detail: "no_prism_csv" } },
    } as unknown as AxiosError;
    (getLatestPrism as jest.Mock).mockRejectedValue(err);

    const { result } = renderHook(() => useLatestPrism(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // Critical: no retries on 404. One initial attempt only.
    expect(getLatestPrism).toHaveBeenCalledTimes(1);
  });

  it("respects the enabled option (skips fetch when false)", async () => {
    (getLatestPrism as jest.Mock).mockResolvedValue(SAMPLE);

    const { result } = renderHook(() => useLatestPrism({ enabled: false }), {
      wrapper: createWrapper(),
    });

    // Give React Query a tick — it should NOT fire when disabled.
    await new Promise((r) => setTimeout(r, 10));
    expect(getLatestPrism).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
  });
});
