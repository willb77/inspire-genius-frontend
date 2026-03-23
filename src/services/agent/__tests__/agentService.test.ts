import {
  getAgentConversation,
  createConversation,
  getConversationDetail,
  deleteConversation,
  renameConversation,
  exportConversation,
  type AgentConversationParams,
} from "../agentService";
import { api } from "@/lib/axios";
import { format } from "date-fns";

// Mock the axios instance
jest.mock("@/lib/axios", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

// Mock date-fns
jest.mock("date-fns", () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === "yyyy-MM-dd") {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return "2024-01-01";
  }),
}));

describe("chat.service", () => {
  const mockApi = api as jest.Mocked<typeof api>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAgentConversation", () => {
    const agentId = "agent-123";

    it("should fetch conversations with default parameters", async () => {
      const mockResponse = {
        data: {
          conversations: [
            { id: "conv-1", title: "Conversation 1" },
            { id: "conv-2", title: "Conversation 2" },
          ],
          total: 2,
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await getAgentConversation(agentId);

      expect(mockApi.get).toHaveBeenCalledWith("/v1/chat/conversations", {
        params: {
          agent_id: agentId,
          page: 1,
          limit: 20,
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should fetch conversations with custom page and limit", async () => {
      const mockResponse = {
        data: {
          conversations: [],
          total: 0,
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const params: AgentConversationParams = {
        page: 2,
        limit: 50,
      };

      await getAgentConversation(agentId, params);

      expect(mockApi.get).toHaveBeenCalledWith("/v1/chat/conversations", {
        params: {
          agent_id: agentId,
          page: 2,
          limit: 50,
        },
      });
    });

    it("should include search parameter when provided", async () => {
      const mockResponse = {
        data: {
          conversations: [{ id: "conv-1", title: "Searched Conversation" }],
          total: 1,
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const params: AgentConversationParams = {
        search: "test query",
      };

      await getAgentConversation(agentId, params);

      expect(mockApi.get).toHaveBeenCalledWith("/v1/chat/conversations", {
        params: {
          agent_id: agentId,
          page: 1,
          limit: 20,
          search: "test query",
        },
      });
    });

    it("should trim search parameter", async () => {
      const mockResponse = { data: {} };
      mockApi.get.mockResolvedValue(mockResponse);

      await getAgentConversation(agentId, { search: "  search with spaces  " });

      expect(mockApi.get).toHaveBeenCalledWith("/v1/chat/conversations", {
        params: {
          agent_id: agentId,
          page: 1,
          limit: 20,
          search: "search with spaces",
        },
      });
    });

    it("should not include search parameter when search is empty string", async () => {
      const mockResponse = { data: {} };
      mockApi.get.mockResolvedValue(mockResponse);

      await getAgentConversation(agentId, { search: "" });

      expect(mockApi.get).toHaveBeenCalledWith("/v1/chat/conversations", {
        params: {
          agent_id: agentId,
          page: 1,
          limit: 20,
        },
      });
    });

    it("should not include search parameter when search is only whitespace", async () => {
      const mockResponse = { data: {} };
      mockApi.get.mockResolvedValue(mockResponse);

      await getAgentConversation(agentId, { search: "   " });

      expect(mockApi.get).toHaveBeenCalledWith("/v1/chat/conversations", {
        params: {
          agent_id: agentId,
          page: 1,
          limit: 20,
        },
      });
    });

    it("should handle API errors", async () => {
      const error = new Error("Network error");
      mockApi.get.mockRejectedValue(error);

      await expect(getAgentConversation(agentId)).rejects.toThrow("Network error");
    });

    it("should include all parameters when all are provided", async () => {
      const mockResponse = { data: {} };
      mockApi.get.mockResolvedValue(mockResponse);

      const params: AgentConversationParams = {
        page: 3,
        limit: 100,
        search: "complete search",
      };

      await getAgentConversation(agentId, params);

      expect(mockApi.get).toHaveBeenCalledWith("/v1/chat/conversations", {
        params: {
          agent_id: agentId,
          page: 3,
          limit: 100,
          search: "complete search",
        },
      });
    });
  });

  describe("createConversation", () => {
    const agentId = "agent-456";

    it("should create a new conversation", async () => {
      const mockResponse = {
        data: {
          session_id: "session-123",
          agent_id: agentId,
          created_at: "2024-01-01T00:00:00Z",
        },
      };

      mockApi.post.mockResolvedValue(mockResponse);

      const result = await createConversation(agentId);

      expect(mockApi.post).toHaveBeenCalledWith("/v1/chat/sessions/start", {
        agent_id: agentId,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle creation errors", async () => {
      const error = new Error("Failed to create conversation");
      mockApi.post.mockRejectedValue(error);

      await expect(createConversation(agentId)).rejects.toThrow(
        "Failed to create conversation"
      );
    });

    it("should work with different agent IDs", async () => {
      const mockResponse = { data: { session_id: "session-456" } };
      mockApi.post.mockResolvedValue(mockResponse);

      const differentAgentId = "agent-789";
      await createConversation(differentAgentId);

      expect(mockApi.post).toHaveBeenCalledWith("/v1/chat/sessions/start", {
        agent_id: differentAgentId,
      });
    });
  });

  describe("getConversationDetail", () => {
    const conversationId = "conv-123";

    it("should fetch conversation details with default parameters", async () => {
      const mockResponse = {
        data: {
          messages: [
            { id: "msg-1", content: "Hello" },
            { id: "msg-2", content: "Hi there" },
          ],
          total: 2,
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await getConversationDetail(conversationId);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/v1/chat/conversations/${conversationId}/messages`,
        {
          params: {
            page: 1,
            page_size: 50,
            limit: 50,
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should fetch conversation details with custom page", async () => {
      const mockResponse = { data: { messages: [] } };
      mockApi.get.mockResolvedValue(mockResponse);

      await getConversationDetail(conversationId, 3);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/v1/chat/conversations/${conversationId}/messages`,
        {
          params: {
            page: 3,
            page_size: 50,
            limit: 50,
          },
        }
      );
    });

    it("should fetch conversation details with custom page and pageSize", async () => {
      const mockResponse = { data: { messages: [] } };
      mockApi.get.mockResolvedValue(mockResponse);

      await getConversationDetail(conversationId, 2, 100);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/v1/chat/conversations/${conversationId}/messages`,
        {
          params: {
            page: 2,
            page_size: 100,
            limit: 100,
          },
        }
      );
    });

    it("should handle API errors", async () => {
      const error = new Error("Conversation not found");
      mockApi.get.mockRejectedValue(error);

      await expect(getConversationDetail(conversationId)).rejects.toThrow(
        "Conversation not found"
      );
    });

    it("should work with different conversation IDs", async () => {
      const mockResponse = { data: { messages: [] } };
      mockApi.get.mockResolvedValue(mockResponse);

      const differentConvId = "conv-456";
      await getConversationDetail(differentConvId);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/v1/chat/conversations/${differentConvId}/messages`,
        expect.any(Object)
      );
    });
  });

  describe("deleteConversation", () => {
    const conversationId = "conv-123";

    it("should delete a conversation", async () => {
      const mockResponse = {
        data: {
          success: true,
          message: "Conversation deleted",
        },
      };

      mockApi.delete.mockResolvedValue(mockResponse);

      const result = await deleteConversation(conversationId);

      expect(mockApi.delete).toHaveBeenCalledWith(
        `/v1/chat/conversations/${conversationId}`
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle deletion errors", async () => {
      const error = new Error("Failed to delete conversation");
      mockApi.delete.mockRejectedValue(error);

      await expect(deleteConversation(conversationId)).rejects.toThrow(
        "Failed to delete conversation"
      );
    });

    it("should work with different conversation IDs", async () => {
      const mockResponse = { data: { success: true } };
      mockApi.delete.mockResolvedValue(mockResponse);

      const differentConvId = "conv-789";
      await deleteConversation(differentConvId);

      expect(mockApi.delete).toHaveBeenCalledWith(
        `/v1/chat/conversations/${differentConvId}`
      );
    });
  });

  describe("renameConversation", () => {
    const conversationId = "conv-123";
    const newTitle = "New Conversation Title";

    it("should rename a conversation", async () => {
      const mockResponse = {
        data: {
          id: conversationId,
          title: newTitle,
          updated_at: "2024-01-01T00:00:00Z",
        },
      };

      mockApi.patch.mockResolvedValue(mockResponse);

      const result = await renameConversation(conversationId, newTitle);

      expect(mockApi.patch).toHaveBeenCalledWith(
        `/v1/chat/conversations/${conversationId}`,
        { title: newTitle }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should handle rename errors", async () => {
      const error = new Error("Failed to rename conversation");
      mockApi.patch.mockRejectedValue(error);

      await expect(renameConversation(conversationId, newTitle)).rejects.toThrow(
        "Failed to rename conversation"
      );
    });

    it("should work with empty title", async () => {
      const mockResponse = { data: { id: conversationId, title: "" } };
      mockApi.patch.mockResolvedValue(mockResponse);

      await renameConversation(conversationId, "");

      expect(mockApi.patch).toHaveBeenCalledWith(
        `/v1/chat/conversations/${conversationId}`,
        { title: "" }
      );
    });

    it("should work with long title", async () => {
      const longTitle = "A".repeat(200);
      const mockResponse = { data: { id: conversationId, title: longTitle } };
      mockApi.patch.mockResolvedValue(mockResponse);

      await renameConversation(conversationId, longTitle);

      expect(mockApi.patch).toHaveBeenCalledWith(
        `/v1/chat/conversations/${conversationId}`,
        { title: longTitle }
      );
    });

    it("should work with special characters in title", async () => {
      const specialTitle = "Test @#$% & <> Title";
      const mockResponse = { data: { id: conversationId, title: specialTitle } };
      mockApi.patch.mockResolvedValue(mockResponse);

      await renameConversation(conversationId, specialTitle);

      expect(mockApi.patch).toHaveBeenCalledWith(
        `/v1/chat/conversations/${conversationId}`,
        { title: specialTitle }
      );
    });
  });

  describe("exportConversation", () => {
    const conversationId = "conv-123";
    const fromDate = new Date(2024, 0, 1);
    const toDate = new Date(2024, 0, 31);

    beforeEach(() => {
      // Mock timezone
      jest.spyOn(Intl, "DateTimeFormat").mockImplementation(
        () =>
          ({
            resolvedOptions: () => ({ timeZone: "America/New_York" }),
          } as any)
      );
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should export conversation as PDF", async () => {
      const mockResponse = {
        data: {
          status: true,
          file_name: "conversation_2024-01-01_to_2024-01-31.pdf",
          mime_type: "application/pdf",
          base64_pdf: "base64pdfdata",
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await exportConversation(conversationId, fromDate, toDate);

      expect(format).toHaveBeenCalledWith(fromDate, "yyyy-MM-dd");
      expect(format).toHaveBeenCalledWith(toDate, "yyyy-MM-dd");

      expect(mockApi.get).toHaveBeenCalledWith(
        `/v1/chat/conversations/${conversationId}/download`,
        {
          params: {
            start_date: "2024-01-01",
            end_date: "2024-01-31",
            timezone: "America/New_York",
          },
        }
      );

      expect(result).toEqual(mockResponse.data);
      expect(result.base64_pdf).toBe("base64pdfdata");
    });

    it("should export conversation as CSV", async () => {
      const mockResponse = {
        data: {
          status: true,
          file_name: "conversation_2024-01-01_to_2024-01-31.csv",
          mime_type: "text/csv",
          base64_csv: "base64csvdata",
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await exportConversation(conversationId, fromDate, toDate);

      expect(result).toEqual(mockResponse.data);
      expect(result.base64_csv).toBe("base64csvdata");
    });

    it("should use UTC timezone as fallback", async () => {
      // Mock timezone to return undefined
      jest.spyOn(Intl, "DateTimeFormat").mockImplementation(
        () =>
          ({
            resolvedOptions: () => ({ timeZone: undefined }),
          } as any)
      );

      const mockResponse = {
        data: {
          status: true,
          file_name: "conversation.pdf",
          mime_type: "application/pdf",
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await exportConversation(conversationId, fromDate, toDate);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            timezone: "UTC",
          }),
        })
      );
    });

    it("should handle export errors", async () => {
      const error = new Error("Export failed");
      mockApi.get.mockRejectedValue(error);

      await expect(
        exportConversation(conversationId, fromDate, toDate)
      ).rejects.toThrow("Export failed");
    });

    it("should handle same from and to dates", async () => {
      const sameDate = new Date(2024, 0, 15);
      const mockResponse = {
        data: {
          status: true,
          file_name: "conversation_2024-01-15_to_2024-01-15.pdf",
          mime_type: "application/pdf",
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      await exportConversation(conversationId, sameDate, sameDate);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            start_date: "2024-01-15",
            end_date: "2024-01-15",
          }),
        })
      );
    });

    it("should format dates correctly", async () => {
      const mockResponse = {
        data: {
          status: true,
          file_name: "conversation.pdf",
          mime_type: "application/pdf",
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const customFromDate = new Date(2024, 2, 15);
      const customToDate = new Date(2024, 11, 25);

      await exportConversation(conversationId, customFromDate, customToDate);

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            start_date: "2024-03-15",
            end_date: "2024-12-25",
          }),
        })
      );
    });

    it("should work with different conversation IDs", async () => {
      const mockResponse = {
        data: {
          status: true,
          file_name: "conversation.pdf",
          mime_type: "application/pdf",
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const differentConvId = "conv-456";
      await exportConversation(differentConvId, fromDate, toDate);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/v1/chat/conversations/${differentConvId}/download`,
        expect.any(Object)
      );
    });

    it("should handle response with status false", async () => {
      const mockResponse = {
        data: {
          status: false,
          file_name: "",
          mime_type: "",
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await exportConversation(conversationId, fromDate, toDate);

      expect(result.status).toBe(false);
    });

    it("should include both base64_pdf and base64_csv if provided", async () => {
      const mockResponse = {
        data: {
          status: true,
          file_name: "conversation.pdf",
          mime_type: "application/pdf",
          base64_pdf: "pdfdata",
          base64_csv: "csvdata",
        },
      };

      mockApi.get.mockResolvedValue(mockResponse);

      const result = await exportConversation(conversationId, fromDate, toDate);

      expect(result.base64_pdf).toBe("pdfdata");
      expect(result.base64_csv).toBe("csvdata");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors in getAgentConversation", async () => {
      const networkError = new Error("Network Error");
      networkError.name = "NetworkError";
      mockApi.get.mockRejectedValue(networkError);

      await expect(getAgentConversation("agent-123")).rejects.toThrow(
        "Network Error"
      );
    });

    it("should handle 404 errors in getConversationDetail", async () => {
      const notFoundError = new Error("Not Found");
      (notFoundError as any).response = { status: 404 };
      mockApi.get.mockRejectedValue(notFoundError);

      await expect(getConversationDetail("conv-123")).rejects.toThrow("Not Found");
    });

    it("should handle 401 errors in deleteConversation", async () => {
      const unauthorizedError = new Error("Unauthorized");
      (unauthorizedError as any).response = { status: 401 };
      mockApi.delete.mockRejectedValue(unauthorizedError);

      await expect(deleteConversation("conv-123")).rejects.toThrow("Unauthorized");
    });

    it("should handle 500 errors in createConversation", async () => {
      const serverError = new Error("Internal Server Error");
      (serverError as any).response = { status: 500 };
      mockApi.post.mockRejectedValue(serverError);

      await expect(createConversation("agent-123")).rejects.toThrow(
        "Internal Server Error"
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined response data", async () => {
      mockApi.get.mockResolvedValue({ data: undefined });

      const result = await getAgentConversation("agent-123");

      expect(result).toBeUndefined();
    });

    it("should handle null response data", async () => {
      mockApi.get.mockResolvedValue({ data: null });

      const result = await getAgentConversation("agent-123");

      expect(result).toBeNull();
    });

    it("should handle empty string as conversation ID", async () => {
      const mockResponse = { data: {} };
      mockApi.get.mockResolvedValue(mockResponse);

      await getConversationDetail("");

      expect(mockApi.get).toHaveBeenCalledWith("/v1/chat/conversations//messages", expect.any(Object));
    });

    it("should handle very long agent ID", async () => {
      const longAgentId = "agent-" + "a".repeat(1000);
      const mockResponse = { data: {} };
      mockApi.get.mockResolvedValue(mockResponse);

      await getAgentConversation(longAgentId);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/v1/chat/conversations",
        expect.objectContaining({
          params: expect.objectContaining({
            agent_id: longAgentId,
          }),
        })
      );
    });
  });
});