import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAgentConversation } from "../useAgentConversation";
import * as agentService from "@/services/agent/agentService";

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

//mock API
jest.mock("@/services/agent/agentService");

const mockedGetAgentConversation =
  agentService.getAgentConversation as jest.Mock;

//wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // important for tests
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useAgentConversation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call getAgentConversation when agentId is provided", async () => {
    const mockResponse = {
      data: [{ id: "1", message: "Hello" }],
      total: 1,
    };

    mockedGetAgentConversation.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(
      () =>
        useAgentConversation("agent-123", {
          page: 1,
          limit: 20,
          search: "",
        }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedGetAgentConversation).toHaveBeenCalledWith("agent-123", {
      page: 1,
      limit: 20,
      search: "",
    });

    expect(result.current.data).toEqual(mockResponse);
  });

  it("should not call API when agentId is undefined", async () => {
    renderHook(() => useAgentConversation(undefined), {
      wrapper: createWrapper(),
    });

    expect(mockedGetAgentConversation).not.toHaveBeenCalled();
  });

  it("should pass correct query params in queryKey", async () => {
    mockedGetAgentConversation.mockResolvedValueOnce({ data: [] });

    renderHook(
      () =>
        useAgentConversation("agent-456", {
          page: 2,
          limit: 10,
          search: "hello",
        }),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(mockedGetAgentConversation).toHaveBeenCalled();
    });

    expect(mockedGetAgentConversation).toHaveBeenCalledWith("agent-456", {
      page: 2,
      limit: 10,
      search: "hello",
    });
  });

  it("should handle API error correctly", async () => {
    mockedGetAgentConversation.mockRejectedValueOnce(new Error("API Error"));

    const { result } = renderHook(() => useAgentConversation("agent-error"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("should not refetch immediately because staleTime is set", async () => {
    const mockResponse = { data: [{ id: "1" }] };
    mockedGetAgentConversation.mockResolvedValue(mockResponse);

    const wrapper = createWrapper();

    const { result, rerender } = renderHook(
      () => useAgentConversation("agent-1"),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender();

    // still only called once due to staleTime
    expect(mockedGetAgentConversation).toHaveBeenCalledTimes(1);
  });
  it("should not refetch on window focus", async () => {
    mockedGetAgentConversation.mockResolvedValue({ data: [] });

    const { result } = renderHook(() => useAgentConversation("agent-focus"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    window.dispatchEvent(new Event("focus"));

    expect(mockedGetAgentConversation).toHaveBeenCalledTimes(1);
  });
  it("should use default params when none are provided", async () => {
    mockedGetAgentConversation.mockResolvedValue({ data: [] });

    renderHook(() => useAgentConversation("agent-default"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockedGetAgentConversation).toHaveBeenCalled());

    expect(mockedGetAgentConversation).toHaveBeenCalledWith("agent-default", {
      page: 1,
      limit: 20,
    });
  });
  it("should refetch when pagination params change", async () => {
    mockedGetAgentConversation.mockResolvedValue({ data: [] });

    const { rerender } = renderHook(
      ({ page }) =>
        useAgentConversation("agent-params", {
          page,
          limit: 10,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { page: 1 },
      },
    );

    await waitFor(() =>
      expect(mockedGetAgentConversation).toHaveBeenCalledTimes(1),
    );

    rerender({ page: 2 });

    await waitFor(() =>
      expect(mockedGetAgentConversation).toHaveBeenCalledTimes(2),
    );
  });
});
