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
    page?: number;
    page_size?: number;
    has_next?: boolean;
  };
}

export function useConversationMessagesInfinite(conversationId?: string, pageSize: number = 50) {
  return useInfiniteQuery<ConversationMessagesPage, Error, ConversationMessagesPage, [string, string | undefined], number>({
    queryKey: ["conversation-messages", conversationId],
    enabled: Boolean(conversationId),
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      if (!conversationId) return { data: { messages: [], page: pageParam, page_size: pageSize, has_next: false } } as ConversationMessagesPage;
      const resp = await getConversationDetail(conversationId, pageParam, pageSize);
      return resp as ConversationMessagesPage;
    },
    getNextPageParam: (lastPage) => {
      const data = lastPage?.data;
      if (!data) return undefined;
      if (data.has_next) {
        const current = typeof data.page === "number" ? data.page : 1;
        return current + 1;
      }
      return undefined;
    },
    staleTime: 15_000,
  });
}
