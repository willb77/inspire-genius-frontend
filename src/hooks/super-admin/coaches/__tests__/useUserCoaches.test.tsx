import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUserCoaches } from "../useUserCoaches";
import { getUserAgentAssignments } from "@/services/super-admin/coaches/coachesService";

/* -------------------------------------------------
 MOCK API SERVICE
------------------------------------------------- */
jest.mock("@/services/super-admin/coaches/coachesService", () => ({
  getUserAgentAssignments: jest.fn(),
}));

/* -------------------------------------------------
 TEST WRAPPER
------------------------------------------------- */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/* -------------------------------------------------
 TEST DATA
------------------------------------------------- */
const mockApiResponse = {
  data: {
    user_name: "John Doe",
    agents: [
      { id: "1", name: "Agent One" },
      { id: "2", name: "Agent Two" },
    ],
  },
};

/* -------------------------------------------------
 TESTS
------------------------------------------------- */
describe("useUserCoaches hook", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("fetches user coaches when userId is provided", async () => {
    (getUserAgentAssignments as jest.Mock).mockResolvedValueOnce(
      mockApiResponse
    );

    const { result } = renderHook(() => useUserCoaches("user-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getUserAgentAssignments).toHaveBeenCalledWith("user-1");
    expect(result.current.data?.user_name).toBe("John Doe");
    expect(result.current.data?.agents).toHaveLength(2);
  });

  it("returns empty agents list and empty user_name when API returns no agents", async () => {
    (getUserAgentAssignments as jest.Mock).mockResolvedValueOnce({
      data: {},
    });

    const { result } = renderHook(() => useUserCoaches("user-2"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      user_name: "",
      agents: [],
    });
  });

  it("does not fetch and keeps data undefined when userId is undefined", async () => {
    const { result } = renderHook(() => useUserCoaches(undefined), {
      wrapper: createWrapper(),
    });

    // Query is disabled → queryFn never runs
    expect(result.current.data).toBeUndefined();
    expect(getUserAgentAssignments).not.toHaveBeenCalled();
  });
});
