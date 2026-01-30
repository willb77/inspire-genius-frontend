/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Help from "../Help";
import { useIssues } from "@/hooks/help/useIssues";

// --------------------
// Layout mock
// --------------------
jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

// --------------------
// Hooks mocks
// --------------------
const mockMutateAsync = jest.fn();
const mockRefetch = jest.fn();

jest.mock("@/hooks/help/useCreateIssue", () => ({
  useCreateIssue: jest.fn((options) => ({
    isPending: false,
    mutateAsync: async (fd: FormData) => {
      await mockMutateAsync(fd);
      options?.onSuccess?.({}, fd, undefined);
    },
  })),
}));

jest.mock("@/hooks/help/useIssues", () => ({
  useIssues: jest.fn(),
}));

jest.mock("@/hooks/help/useIssueTypes", () => ({
  useIssueTypes: jest.fn(() => ({
    data: {
      data: [
        { id: "1", name: "Bug" },
        { id: "2", name: "Feature" },
      ],
    },
    isPending: false,
  })),
}));

// --------------------
// Component mocks
// --------------------
jest.mock("@/components/help/HelpForm", () => ({
  __esModule: true,
  default: ({ onSubmit }: any) => (
    <button
      data-testid="submit-help-form"
      onClick={() =>
        onSubmit({
          issueTypeId: "1",
          subject: "Test Subject",
          description: "Test Description",
          priority: "medium",
          attachments: [],
        })
      }
    >
      Submit Help Form
    </button>
  ),
}));

jest.mock("@/components/help/IssueSubmitted", () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="issue-submitted-dialog" /> : null,
}));

jest.mock("@/components/shared/SearchBar", () => ({
  __esModule: true,
  default: () => <div />,
}));

jest.mock("@/components/shared/Pagination", () => ({
  __esModule: true,
  default: () => <div data-testid="pagination" />,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// --------------------
// Tests
// --------------------
describe("Help Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders page title", () => {
    (useIssues as jest.Mock).mockReturnValue({
      data: { data: { items: [], total: 0 } },
      isPending: false,
      refetch: mockRefetch,
    });

    render(<Help />);
    expect(screen.getByText("Help and Support")).toBeInTheDocument();
  });

  it("shows loading skeletons while listing is pending", () => {
    (useIssues as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: true,
      refetch: mockRefetch,
    });

    render(<Help />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("shows empty state when no issues", () => {
    (useIssues as jest.Mock).mockReturnValue({
      data: { data: { items: [], total: 0 } },
      isPending: false,
      refetch: mockRefetch,
    });

    render(<Help />);
    expect(screen.getByText("No issues found.")).toBeInTheDocument();
  });

  it("renders issues list with admin comment and pagination", () => {
    (useIssues as jest.Mock).mockReturnValue({
      data: {
        data: {
          total: 1,
          items: [
            {
              id: "1",
              subject: "Login issue",
              description: "Cannot login",
              status: "open",
              priority: "high",
              created_at: new Date().toISOString(),
              admin_comment: {
                comment: "We are looking into it",
                created_at: new Date().toISOString(),
              },
            },
          ],
        },
      },
      isPending: false,
      refetch: mockRefetch,
    });

    render(<Help />);

    expect(screen.getByText("Login issue")).toBeInTheDocument();
    expect(screen.getByText("Cannot login")).toBeInTheDocument();
    expect(screen.getByText("We are looking into it")).toBeInTheDocument();
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("submits help form and shows success dialog", async () => {
    (useIssues as jest.Mock).mockReturnValue({
      data: { data: { items: [], total: 0 } },
      isPending: false,
      refetch: mockRefetch,
    });

    render(<Help />);

    fireEvent.click(screen.getByTestId("submit-help-form"));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    // ✅ WAIT for React re-render
    await waitFor(() => {
      expect(screen.getByTestId("issue-submitted-dialog")).toBeInTheDocument();
    });
  });
});
