import { renderHook, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  useGetIssueById,
  useAddAdminComment,
} from "../useIssues";
import {
  getIssueById,
  addAdminComment,
} from "@/services/super-admin/dashboard/issues.service";

/* -------------------------------------------------
 MOCK SERVICES
------------------------------------------------- */
jest.mock("@/services/super-admin/dashboard/issues.service", () => ({
  getIssueById: jest.fn(),
  addAdminComment: jest.fn(),
}));

/* -------------------------------------------------
 QUERY CLIENT WRAPPER
------------------------------------------------- */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
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

/* -------------------------------------------------
 MOCK DATA
------------------------------------------------- */
const mockIssue = {
  id: "issue-1",
  subject: "Test Issue",
  description: "Test description",
};

/* -------------------------------------------------
 TESTS
------------------------------------------------- */
describe("useIssues hooks", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /* -------------------------------
     useGetIssueById
  -------------------------------- */

  it("fetches issue by id when issue_id is provided", async () => {
    (getIssueById as jest.Mock).mockResolvedValueOnce({
      data: mockIssue,
    });

    const { result } = renderHook(
      () => useGetIssueById("issue-1"),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getIssueById).toHaveBeenCalledWith("issue-1");
    expect(result.current.data).toEqual(mockIssue);
  });

  it("does not fetch issue when issue_id is undefined", () => {
    const { result } = renderHook(
      () => useGetIssueById(undefined),
      { wrapper: createWrapper() }
    );

    expect(result.current.data).toBeUndefined();
    expect(getIssueById).not.toHaveBeenCalled();
  });

  /* -------------------------------
     useAddAdminComment
  -------------------------------- */

  it("adds admin comment successfully", async () => {
    (addAdminComment as jest.Mock).mockResolvedValueOnce({
      message: "Comment added",
    });

    const { result } = renderHook(
      () => useAddAdminComment(),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync({
      issue_id: "issue-1",
      comment: "Test comment",
    });

    expect(addAdminComment).toHaveBeenCalledWith("issue-1", {
      comment: "Test comment",
    });
  });

  it("adds admin comment with status change", async () => {
    (addAdminComment as jest.Mock).mockResolvedValueOnce({
      message: "Comment added",
    });

    const { result } = renderHook(
      () => useAddAdminComment(),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync({
      issue_id: "issue-1",
      comment: "Resolved comment",
      change_status: "resolved",
    });

    expect(addAdminComment).toHaveBeenCalledWith("issue-1", {
      comment: "Resolved comment",
      change_status: "resolved",
    });
  });

  it("invalidates queries on successful comment add", async () => {
    const invalidateSpy = jest.fn();

    const queryClient = new QueryClient();
    jest
      .spyOn(queryClient, "invalidateQueries")
      .mockImplementation(invalidateSpy);

    (addAdminComment as jest.Mock).mockResolvedValueOnce({});

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () => useAddAdminComment(),
      { wrapper }
    );

    await result.current.mutateAsync({
      issue_id: "issue-1",
      comment: "Test",
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["issue", "issue-1"],
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["issues"],
    });
  });
});
