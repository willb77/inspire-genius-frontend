import { render, screen, fireEvent, act } from "@testing-library/react";
import IssueDetailPage from "../IssueDetailPage";
import { toast } from "sonner";

/* -------------------------------------------------
 MOCK ROUTER
------------------------------------------------- */
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useParams: () => ({ id: "issue-123" }),
  useNavigate: () => mockNavigate,
}));

/* -------------------------------------------------
 MOCK LAYOUT
------------------------------------------------- */
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div>{children}</div>,
}));

/* -------------------------------------------------
 MOCK UI COMPONENTS
------------------------------------------------- */
jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

jest.mock("@/components/ui/label", () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-value={value}>{children}</div>
  ),
}));

/* -------------------------------------------------
 MOCK ICONS
------------------------------------------------- */
jest.mock("lucide-react", () => ({
  AlertCircle: () => <div />,
  User: () => <div />,
  Calendar: () => <div />,
  ChevronLeft: () => <div />,
  MessageSquare: () => <div />,
  Clock: () => <div />,
  FileText: () => <div />,
  Send: () => <div />,
  CheckCircle2: () => <div />,
}));

/* -------------------------------------------------
 MOCK TOAST
------------------------------------------------- */
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

/* -------------------------------------------------
 MOCK HOOKS
------------------------------------------------- */
const mutateAsync = jest.fn();

jest.mock("@/hooks/super-admin/dashboard/useIssues", () => ({
  useGetIssueById: jest.fn(),
  useAddAdminComment: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

/* -------------------------------------------------
 TEST DATA
------------------------------------------------- */
const baseIssue = {
  id: "issue-12345678",
  subject: "Test Issue",
  description: "Issue description",
  status: "open_issue",
  priority: "high",
  reported_by_name: "John Doe",
  created_at: "2024-01-01T10:00:00Z",
  age_in_days: 5,
  issue_type_name: "Bug",
  resolved_at: "2024-01-10T10:00:00Z",
  comments: [
    {
      comment: "Old comment",
      created_at: "2024-01-01T09:00:00Z",
    },
    {
      comment: "New comment",
      created_at: "2024-01-02T09:00:00Z",
    },
  ],
};

/* -------------------------------------------------
 TESTS
------------------------------------------------- */
describe("IssueDetailPage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", () => {
    const { useGetIssueById } = require(
      "@/hooks/super-admin/dashboard/useIssues"
    );

    (useGetIssueById as jest.Mock).mockReturnValue({
      isPending: true,
      isError: false,
      data: null,
    });

    render(<IssueDetailPage />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders error state and navigates back", () => {
    const { useGetIssueById } = require(
      "@/hooks/super-admin/dashboard/useIssues"
    );

    (useGetIssueById as jest.Mock).mockReturnValue({
      isPending: false,
      isError: true,
      data: null,
    });

    render(<IssueDetailPage />);

    fireEvent.click(screen.getByText("Go Back"));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("renders issue details correctly", () => {
    const { useGetIssueById } = require(
      "@/hooks/super-admin/dashboard/useIssues"
    );

    (useGetIssueById as jest.Mock).mockReturnValue({
      isPending: false,
      isError: false,
      data: baseIssue,
    });

    render(<IssueDetailPage />);

    expect(screen.getByText("Issue Details")).toBeInTheDocument();
    expect(screen.getByText("Test Issue")).toBeInTheDocument();
    expect(screen.getByText("Issue description")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("5 days")).toBeInTheDocument();
  });

  it("renders comments sorted by latest first", () => {
    const { useGetIssueById } = require(
      "@/hooks/super-admin/dashboard/useIssues"
    );

    (useGetIssueById as jest.Mock).mockReturnValue({
      isPending: false,
      isError: false,
      data: baseIssue,
    });

    render(<IssueDetailPage />);

    const newComment = screen.getByText("New comment");
    const oldComment = screen.getByText("Old comment");

    expect(
      newComment.compareDocumentPosition(oldComment)
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("shows empty comments state when comments is undefined", () => {
    const { useGetIssueById } = require(
      "@/hooks/super-admin/dashboard/useIssues"
    );

    (useGetIssueById as jest.Mock).mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        ...baseIssue,
        comments: undefined,
      },
    });

    render(<IssueDetailPage />);
    expect(screen.getByText("No comments yet.")).toBeInTheDocument();
  });

  it("submits comment successfully", async () => {
    const { useGetIssueById } = require(
      "@/hooks/super-admin/dashboard/useIssues"
    );

    (useGetIssueById as jest.Mock).mockReturnValue({
      isPending: false,
      isError: false,
      data: baseIssue,
    });

    mutateAsync.mockResolvedValueOnce({ message: "Comment added" });

    render(<IssueDetailPage />);

    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText(/enter your comment/i),
        { target: { value: "Hello" } }
      );
      fireEvent.click(screen.getByText("Submit Comment"));
    });

    expect(mutateAsync).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Comment added");
  });

  it("handles submit error", async () => {
    const { useGetIssueById } = require(
      "@/hooks/super-admin/dashboard/useIssues"
    );

    (useGetIssueById as jest.Mock).mockReturnValue({
      isPending: false,
      isError: false,
      data: baseIssue,
    });

    mutateAsync.mockRejectedValueOnce({
      response: { data: { message: "Failed to add comment" } },
    });

    render(<IssueDetailPage />);

    await act(async () => {
      fireEvent.change(
        screen.getByPlaceholderText(/enter your comment/i),
        { target: { value: "Hello" } }
      );
      fireEvent.click(screen.getByText("Submit Comment"));
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to add comment");
  });

  it("navigates back using header back button", () => {
    const { useGetIssueById } = require(
      "@/hooks/super-admin/dashboard/useIssues"
    );

    (useGetIssueById as jest.Mock).mockReturnValue({
      isPending: false,
      isError: false,
      data: baseIssue,
    });

    render(<IssueDetailPage />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
