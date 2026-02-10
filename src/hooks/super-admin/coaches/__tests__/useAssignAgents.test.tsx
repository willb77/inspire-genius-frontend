import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import { useAssignAgents } from "../useAssignAgents";
import * as service from "@/services/super-admin/coaches/coachesService";

/* -------------------------------------------------
 MOCK SERVICE
------------------------------------------------- */
jest.mock("@/services/super-admin/coaches/coachesService", () => ({
  assignAgentsToUser: jest.fn(),
}));

/* -------------------------------------------------
 TEST UTIL
------------------------------------------------- */
function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe("useAssignAgents", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("assigns agents and invalidates user coaches query when userId is provided", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    (service.assignAgentsToUser as jest.Mock).mockResolvedValue({
      status: true,
    });

    const { result } = renderHook(
      () => useAssignAgents("user-123"),
      { wrapper: createWrapper(queryClient) }
    );

    await act(async () => {
      await result.current.mutateAsync({
        user_id: "user-123",
        agent_ids: ["agent-1", "agent-2"],
        is_active: true,
      });
    });

    expect(service.assignAgentsToUser).toHaveBeenCalledWith({
      user_id: "user-123",
      agent_ids: ["agent-1", "agent-2"],
      is_active: true,
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["super-admin", "user-coaches", "user-123"],
    });
  });

  it("assigns agents but does NOT invalidate cache when userId is undefined", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    (service.assignAgentsToUser as jest.Mock).mockResolvedValue({
      status: true,
    });

    const { result } = renderHook(
      () => useAssignAgents(undefined),
      { wrapper: createWrapper(queryClient) }
    );

    await act(async () => {
      await result.current.mutateAsync({
        user_id: "user-999",
        agent_ids: ["agent-9"],
        is_active: false,
      });
    });

    expect(service.assignAgentsToUser).toHaveBeenCalled();

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
