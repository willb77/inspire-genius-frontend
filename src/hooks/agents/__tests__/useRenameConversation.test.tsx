import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRenameConversation } from "../useRenameConversation";
import * as agentService from "@/services/agent/agentService";

/* ---------------- MOCKS ---------------- */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    put: jest.fn(),
  },
}));

jest.mock("@/services/agent/agentService");

const mockedRenameConversation =
  agentService.renameConversation as jest.Mock;

/* ---------------- TEST HELPER ---------------- */

// IMPORTANT: keep a reference to the QueryClient
const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });

  const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return { wrapper, invalidateSpy };
};

/* ---------------- TESTS ---------------- */

describe("useRenameConversation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call renameConversation with conversationId and title", async () => {
    mockedRenameConversation.mockResolvedValueOnce({ success: true });

    const { wrapper } = setup();

    const { result } = renderHook(() => useRenameConversation(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        conversationId: "conv-1",
        title: "New Title",
        agentId: "agent-1",
      });
    });

    await waitFor(() => {
      expect(mockedRenameConversation).toHaveBeenCalledWith(
        "conv-1",
        "New Title"
      );
    });
  });

  it("should invalidate agent conversation queries when agentId is provided", async () => {
    mockedRenameConversation.mockResolvedValueOnce({ success: true });

    const { wrapper, invalidateSpy } = setup();

    const { result } = renderHook(() => useRenameConversation(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        conversationId: "conv-2",
        title: "Updated Title",
        agentId: "agent-123",
      });
    });

    await waitFor(() => {
      expect(mockedRenameConversation).toHaveBeenCalled();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["agent", "conversation", "agent-123"],
      exact: false,
    });
  });

  it("should invalidate generic agent conversation queries when agentId is missing", async () => {
    mockedRenameConversation.mockResolvedValueOnce({ success: true });

    const { wrapper, invalidateSpy } = setup();

    const { result } = renderHook(() => useRenameConversation(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        conversationId: "conv-3",
        title: "Another Title",
      });
    });

    await waitFor(() => {
      expect(mockedRenameConversation).toHaveBeenCalled();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["agent", "conversation"],
      exact: false,
    });
  });

  it("should handle error when renameConversation fails", async () => {
    mockedRenameConversation.mockRejectedValueOnce(
      new Error("Rename failed")
    );

    const { wrapper } = setup();

    const { result } = renderHook(() => useRenameConversation(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        conversationId: "conv-error",
        title: "Bad Title",
        agentId: "agent-error",
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
