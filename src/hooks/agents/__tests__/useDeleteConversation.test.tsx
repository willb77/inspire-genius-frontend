import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDeleteConversation } from "../useDeleteConversation";
import * as agentService from "@/services/agent/agentService";

/* ---------------- MOCKS ---------------- */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    delete: jest.fn(),
  },
}));

jest.mock("@/services/agent/agentService");

const mockedDeleteConversation =
  agentService.deleteConversation as jest.Mock;

/* ---------------- TEST HELPER ---------------- */

// 🔑 IMPORTANT: keep queryClient reference
const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });

  const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
  const removeSpy = jest.spyOn(queryClient, "removeQueries");

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return { queryClient, invalidateSpy, removeSpy, wrapper };
};

/* ---------------- TESTS ---------------- */

describe("useDeleteConversation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call deleteConversation with conversationId", async () => {
    mockedDeleteConversation.mockResolvedValueOnce({ success: true });

    const { wrapper } = setup();

    const { result } = renderHook(() => useDeleteConversation(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        conversationId: "conv-1",
        agentId: "agent-1",
      });
    });

    await waitFor(() => {
      expect(mockedDeleteConversation).toHaveBeenCalledWith("conv-1");
    });
  });

  it("should invalidate agent conversation queries when agentId is provided", async () => {
    mockedDeleteConversation.mockResolvedValueOnce({ success: true });

    const { wrapper, invalidateSpy, removeSpy } = setup();

    const { result } = renderHook(() => useDeleteConversation(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        conversationId: "conv-2",
        agentId: "agent-123",
      });
    });

    await waitFor(() => {
      expect(mockedDeleteConversation).toHaveBeenCalled();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["agent", "conversation", "agent-123"],
      exact: false,
    });

    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: ["conversation-messages", "conv-2"],
      exact: true,
    });
  });

  it("should invalidate generic agent conversation queries when agentId is missing", async () => {
    mockedDeleteConversation.mockResolvedValueOnce({ success: true });

    const { wrapper, invalidateSpy, removeSpy } = setup();

    const { result } = renderHook(() => useDeleteConversation(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        conversationId: "conv-3",
      });
    });

    await waitFor(() => {
      expect(mockedDeleteConversation).toHaveBeenCalled();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["agent", "conversation"],
      exact: false,
    });

    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: ["conversation-messages", "conv-3"],
      exact: true,
    });
  });

  it("should handle error when deleteConversation fails", async () => {
    mockedDeleteConversation.mockRejectedValueOnce(
      new Error("Delete failed")
    );

    const { wrapper } = setup();

    const { result } = renderHook(() => useDeleteConversation(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        conversationId: "conv-error",
        agentId: "agent-error",
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
