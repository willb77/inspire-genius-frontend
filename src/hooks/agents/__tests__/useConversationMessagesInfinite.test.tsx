import { renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  type InfiniteData,
} from "@tanstack/react-query";
import { useConversationMessagesInfinite } from "../useConversationMessagesInfinite";
import type { ConversationMessagesPage } from "../useConversationMessagesInfinite";
import * as agentService from "@/services/agent/agentService";

/* -------------------- MOCKS -------------------- */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

jest.mock("@/services/agent/agentService");

const mockedGetConversationDetail =
  agentService.getConversationDetail as jest.Mock;

/* -------------------- WRAPPER -------------------- */

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

/* -------------------- TESTS -------------------- */

describe("useConversationMessagesInfinite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch first page when conversationId is provided", async () => {
    mockedGetConversationDetail.mockResolvedValueOnce({
      data: {
        messages: [{ id: 1, text: "hello" }],
        page: 1,
        page_size: 50,
        has_next: false,
      },
    });

    const { result } = renderHook(
      () => useConversationMessagesInfinite("conv-1"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const data = result.current.data as InfiniteData<ConversationMessagesPage>;

    expect(mockedGetConversationDetail).toHaveBeenCalledWith("conv-1", 1, 50);

    expect(data.pages).toHaveLength(1);
    expect(data.pages[0].data?.messages).toHaveLength(1);
  });

  it("should not call API when conversationId is undefined", async () => {
    const { result } = renderHook(
      () => useConversationMessagesInfinite(undefined),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(mockedGetConversationDetail).not.toHaveBeenCalled();
  });

  it("should fetch next page when has_next is true", async () => {
    mockedGetConversationDetail
      .mockResolvedValueOnce({
        data: {
          messages: [{ id: 1 }],
          page: 1,
          page_size: 50,
          has_next: true,
        },
      })
      .mockResolvedValueOnce({
        data: {
          messages: [{ id: 2 }],
          page: 2,
          page_size: 50,
          has_next: false,
        },
      });

    const { result } = renderHook(
      () => useConversationMessagesInfinite("conv-next"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    await result.current.fetchNextPage();

    await waitFor(() => {
      const data = result.current
        .data as InfiniteData<ConversationMessagesPage>;
      expect(data.pages).toHaveLength(2);
    });

    const data = result.current.data as InfiniteData<ConversationMessagesPage>;

    expect(data.pages[1].data?.messages).toHaveLength(1);
    expect(mockedGetConversationDetail).toHaveBeenCalledTimes(2);
  });

  it("should stop pagination when has_next is false", async () => {
    mockedGetConversationDetail.mockResolvedValueOnce({
      data: {
        messages: [{ id: 1 }],
        page: 1,
        page_size: 50,
        has_next: false,
      },
    });

    const { result } = renderHook(
      () => useConversationMessagesInfinite("conv-stop"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.hasNextPage).toBe(false);
  });

  it("should handle API error correctly", async () => {
    mockedGetConversationDetail.mockRejectedValueOnce(new Error("API Error"));

    const { result } = renderHook(
      () => useConversationMessagesInfinite("conv-error"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("should respect custom pageSize", async () => {
    mockedGetConversationDetail.mockResolvedValueOnce({
      data: {
        messages: [],
        page: 1,
        page_size: 20,
        has_next: false,
      },
    });

    renderHook(() => useConversationMessagesInfinite("conv-size", 20), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockedGetConversationDetail).toHaveBeenCalled();
    });

    expect(mockedGetConversationDetail).toHaveBeenCalledWith(
      "conv-size",
      1,
      20,
    );
  });

  it("getNextPageParam should return undefined when has_next is false", async () => {
    mockedGetConversationDetail.mockResolvedValueOnce({
      data: {
        messages: [],
        page: 1,
        has_next: false,
      },
    });

    const { result } = renderHook(
      () => useConversationMessagesInfinite("conv-no-next"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(false);
    });
  });
  it("fetches next page when has_next is true", async () => {
    mockedGetConversationDetail
      .mockResolvedValueOnce({
        data: {
          messages: [{ id: 1 }],
          page: 1,
          has_next: true,
        },
      })
      .mockResolvedValueOnce({
        data: {
          messages: [{ id: 2 }],
          page: 2,
          has_next: false,
        },
      });

    const { result } = renderHook(
      () => useConversationMessagesInfinite("conv-next"),
      { wrapper: createWrapper() },
    );

    // first page
    await waitFor(() => {
      expect(result.current.hasNextPage).toBe(true);
    });

    // trigger next page
    await result.current.fetchNextPage();

    await waitFor(() => {
      const data = result.current
        .data as InfiniteData<ConversationMessagesPage>;
      expect(data.pages).toHaveLength(2);
    });
  });
});
