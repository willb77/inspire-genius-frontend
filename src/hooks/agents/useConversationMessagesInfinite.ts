import { useInfiniteQuery } from "@tanstack/react-query";
import { getConversationDetail } from "@/services/agent/agentService";

export interface ConversationMessagesPage {
  status?: boolean;
  message?: string;
  error_code?: string;
  data?: {
    messages?: Array<Record<string, unknown>>;
    conversation_id?: string;
    total_count?: number;
    // What GET /v1/chat/conversations/{id}/messages actually returns today:
    // `total` and `pages`, oldest first. It has never sent `has_next`.
    total?: number;
    pages?: number;
    page?: number;
    page_size?: number;
    has_next?: boolean;
  };
}

/**
 * The page after `lastPage`, or `undefined` when there is none.
 *
 * Reading `has_next` alone stopped every conversation at its first 50
 * messages: the engine returns `{messages, total, page, pages}` and never
 * `has_next`, so page 2 was never requested and the newest messages of any
 * long conversation silently did not render. Honour `has_next` when it is
 * present, otherwise derive from `pages`, then from `total` against what has
 * loaded. Every branch is bounded by a count the server sent, so an empty or
 * malformed page ends paging rather than looping.
 */
export function nextMessagesPageParam(
  lastPage: ConversationMessagesPage | undefined,
  allPages: ConversationMessagesPage[],
): number | undefined {
  const data = lastPage?.data;
  if (!data) return undefined;
  const current = typeof data.page === "number" ? data.page : 1;
  if (typeof data.has_next === "boolean") return data.has_next ? current + 1 : undefined;
  if (typeof data.pages === "number") return current < data.pages ? current + 1 : undefined;
  const total = typeof data.total === "number" ? data.total : data.total_count;
  if (typeof total === "number") {
    if (!Array.isArray(data.messages) || data.messages.length === 0) return undefined;
    const loaded = allPages.reduce(
      (n, p) => n + (Array.isArray(p?.data?.messages) ? p.data!.messages!.length : 0),
      0,
    );
    return loaded < total ? current + 1 : undefined;
  }
  return undefined;
}

export function useConversationMessagesInfinite(conversationId?: string, pageSize: number = 50) {
  return useInfiniteQuery<ConversationMessagesPage, Error, ConversationMessagesPage, [string, string | undefined], number>({
    queryKey: ["conversation-messages", conversationId],
    enabled: Boolean(conversationId),
    refetchOnWindowFocus: false,
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      if (!conversationId) return { data: { messages: [], page: pageParam, page_size: pageSize, has_next: false } } as ConversationMessagesPage;
      const resp = await getConversationDetail(conversationId, pageParam, pageSize);
      return resp as ConversationMessagesPage;
    },
    getNextPageParam: (lastPage, allPages) => nextMessagesPageParam(lastPage, allPages),
    staleTime: 15_000,
  });
}
