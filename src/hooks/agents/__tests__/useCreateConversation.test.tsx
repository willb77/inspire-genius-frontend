import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCreateConversation } from "../useCreateConversation";
import * as agentService from "@/services/agent/agentService";

/* ---------------- MOCKS ---------------- */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

jest.mock("@/services/agent/agentService");

const mockedCreateConversation =
  agentService.createConversation as jest.Mock;

/* ---------------- WRAPPER ---------------- */

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

/* ---------------- TESTS ---------------- */

describe("useCreateConversation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call createConversation with correct agentId", async () => {
    mockedCreateConversation.mockResolvedValueOnce({
      conversation_id: "conv-1",
    });

    const { result } = renderHook(() => useCreateConversation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ agentId: "agent-123" });
    });

    await waitFor(() => {
      expect(mockedCreateConversation).toHaveBeenCalledWith("agent-123");
    });
  });

  it("should return data on successful mutation", async () => {
    const mockResponse = {
      conversation_id: "conv-2",
    };

    mockedCreateConversation.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useCreateConversation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ agentId: "agent-456" });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
  });

  it("should handle error when mutation fails", async () => {
    mockedCreateConversation.mockRejectedValueOnce(
      new Error("API Error")
    );

    const { result } = renderHook(() => useCreateConversation(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate({ agentId: "agent-error" });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });
});
