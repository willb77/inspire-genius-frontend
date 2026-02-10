import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act } from "@testing-library/react";
import {
  useCoachesList,
  useCoachCategories,
  useCreateCoach,
  useUpdateCoach,
  useDeactivateCoach,
} from "../useCoaches";

import * as service from "@/services/super-admin/coachManagementService";

/* -------------------------------------------------
 MOCK SERVICES
------------------------------------------------- */
jest.mock("@/services/super-admin/coachManagementService", () => ({
  listAgents: jest.fn(),
  createCoach: jest.fn(),
  updateCoach: jest.fn(),
  deactivateCoach: jest.fn(),
  getCoachCategories: jest.fn(),
}));

/* -------------------------------------------------
 TEST UTIL
------------------------------------------------- */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe("coach management hooks", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /* --------------------------------
     useCoachesList
  --------------------------------- */
  it("fetches coaches list", async () => {
    (service.listAgents as jest.Mock).mockResolvedValue({
      data: { agents: [], pagination: { total: 0, page: 1, page_size: 10 } },
    });

    const { result } = renderHook(
      () => useCoachesList({ page: 1, limit: 10 }),
      { wrapper: createWrapper() }
    );

    await result.current.refetch();

    expect(service.listAgents).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
  });

  /* --------------------------------
     useCoachCategories
  --------------------------------- */
  it("fetches coach categories", async () => {
    (service.getCoachCategories as jest.Mock).mockResolvedValue({
      status: true,
      data: { Tones: [] },
    });

    const { result } = renderHook(() => useCoachCategories(), {
      wrapper: createWrapper(),
    });

    await result.current.refetch();

    expect(service.getCoachCategories).toHaveBeenCalled();
  });

  /* --------------------------------
     useCreateCoach
  --------------------------------- */
  it("creates coach and invalidates coaches query", async () => {
    (service.createCoach as jest.Mock).mockResolvedValue({
      status: true,
    });

    const { result } = renderHook(() => useCreateCoach(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        name: "Coach A",
        prompt: "Test prompt",
      });
    });

    expect(service.createCoach).toHaveBeenCalledWith({
      name: "Coach A",
      prompt: "Test prompt",
    });
  });

  /* --------------------------------
     useUpdateCoach
  --------------------------------- */
  it("updates coach and invalidates coaches query", async () => {
    (service.updateCoach as jest.Mock).mockResolvedValue({
      status: true,
    });

    const { result } = renderHook(() => useUpdateCoach(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        agent_id: "agent-1",
        prompt: "Updated prompt",
        status: "active",
      });
    });

    expect(service.updateCoach).toHaveBeenCalledWith({
      agent_id: "agent-1",
      prompt: "Updated prompt",
      status: "active",
    });
  });

  /* --------------------------------
     useDeactivateCoach
  --------------------------------- */
  it("deactivates coach and invalidates coaches query", async () => {
    (service.deactivateCoach as jest.Mock).mockResolvedValue({
      status: true,
    });

    const { result } = renderHook(() => useDeactivateCoach(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("agent-123");
    });

    expect(service.deactivateCoach).toHaveBeenCalledWith("agent-123");
  });
});
