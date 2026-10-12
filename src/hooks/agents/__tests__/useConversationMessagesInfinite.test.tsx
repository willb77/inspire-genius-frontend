import { renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  nextMessagesPageParam,
  useConversationMessagesInfinite,
} from "../useConversationMessagesInfinite";
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

/*
 * The shape GET /v1/chat/conversations/{id}/messages really returns
 * (services/agent-engine/app/routes/conversations.py, get_messages):
 * {messages, total, page, pages} — oldest first, and NO has_next. The tests
 * above mock a has_next the server has never sent, which is how a reopened
 * conversation came to stop at its first 50 messages without failing any test.
 */
const serverPage = (page: number, count: number, total: number, pageSize = 50) => ({
  status: true,
  data: {
    messages: Array.from({ length: count }, (_, i) => ({
      id: `m-${(page - 1) * pageSize + i}`,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  },
});

describe("useConversationMessagesInfinite — the server's real page shape", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("offers page 2 of a 78-message conversation, then stops", async () => {
    mockedGetConversationDetail
      .mockResolvedValueOnce(serverPage(1, 50, 78))
      .mockResolvedValueOnce(serverPage(2, 28, 78));

    const { result } = renderHook(
      () => useConversationMessagesInfinite("conv-78"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    await waitFor(() => {
      const data = result.current.data as InfiniteData<ConversationMessagesPage>;
      expect(data.pages).toHaveLength(2);
    });
    const data = result.current.data as InfiniteData<ConversationMessagesPage>;
    expect(data.pages.flatMap((p) => p.data?.messages ?? [])).toHaveLength(78);
    expect(mockedGetConversationDetail).toHaveBeenLastCalledWith("conv-78", 2, 50);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("makes one request for a conversation of 50 messages or fewer", async () => {
    mockedGetConversationDetail.mockResolvedValueOnce(serverPage(1, 50, 50));

    const { result } = renderHook(
      () => useConversationMessagesInfinite("conv-50"),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.hasNextPage).toBe(false);
    expect(mockedGetConversationDetail).toHaveBeenCalledTimes(1);
  });
});

describe("nextMessagesPageParam", () => {
  const page = (data: ConversationMessagesPage["data"]): ConversationMessagesPage => ({ data });

  it("honours has_next when the server sends it, over pages", () => {
    const last = page({ page: 1, pages: 3, has_next: false, messages: [{}] });
    expect(nextMessagesPageParam(last, [last])).toBeUndefined();
  });

  it("derives from pages when has_next is absent", () => {
    const p1 = page({ page: 1, pages: 3, messages: [{}] });
    const p3 = page({ page: 3, pages: 3, messages: [{}] });
    expect(nextMessagesPageParam(p1, [p1])).toBe(2);
    expect(nextMessagesPageParam(p3, [p3])).toBeUndefined();
  });

  it("falls back to total against what has loaded", () => {
    const p1 = page({ page: 1, total: 3, messages: [{}, {}] });
    expect(nextMessagesPageParam(p1, [p1])).toBe(2);
    const p2 = page({ page: 2, total: 3, messages: [{}] });
    expect(nextMessagesPageParam(p2, [p1, p2])).toBeUndefined();
  });

  it("stops on an empty page even when total says more, so it cannot loop", () => {
    const p1 = page({ page: 1, total: 10, messages: [] });
    expect(nextMessagesPageParam(p1, [p1])).toBeUndefined();
  });

  it("stops when the page carries no count at all", () => {
    const p1 = page({ page: 1, messages: [{}] });
    expect(nextMessagesPageParam(p1, [p1])).toBeUndefined();
    expect(nextMessagesPageParam(undefined, [])).toBeUndefined();
  });
});
