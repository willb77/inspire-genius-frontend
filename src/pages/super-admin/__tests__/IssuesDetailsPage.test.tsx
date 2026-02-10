import { render, screen, fireEvent } from "@testing-library/react";
import IssuesDetailsPage from "../IssuesDetailsPage";

/* -------------------------------------------------
 MOCK ROUTER
------------------------------------------------- */
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
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
  Card: ({ children, onClick }: any) => (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}>{children}</div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

/* -------------------------------------------------
 MOCK ICONS
------------------------------------------------- */
jest.mock("lucide-react", () => ({
  AlertCircle: () => <div />,
  User: () => <div />,
  Calendar: () => <div />,
  ChevronLeft: () => <div />,
  ChevronRight: () => <div />,
}));

/* -------------------------------------------------
 MOCK PAGINATION
------------------------------------------------- */
jest.mock("@/components/shared/Pagination", () => (props: any) => (
  <button onClick={() => props.onPageChange(2)}>Next Page</button>
));

/* -------------------------------------------------
 MOCK HOOK
------------------------------------------------- */
jest.mock("@/hooks/help/useIssues", () => ({
  useIssues: jest.fn(),
}));

/* -------------------------------------------------
 TEST DATA
------------------------------------------------- */
const mockIssues = [
  {
    id: "issue-1",
    subject: "Issue One",
    description: "First issue description",
    status: "open_issue",
    priority: "high",
    reported_by_name: "John Doe",
    created_at: "2024-01-01T10:00:00Z",
    issue_type_name: "Bug",
  },
];

/* -------------------------------------------------
 TESTS
------------------------------------------------- */
describe("IssuesDetailsPage", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading skeletons when loading", () => {
    const { useIssues } = require("@/hooks/help/useIssues");

    useIssues.mockReturnValue({
      isPending: true,
      isRefetching: false,
      isError: false,
      data: null,
    });

    render(<IssuesDetailsPage />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders error state", () => {
    const { useIssues } = require("@/hooks/help/useIssues");

    useIssues.mockReturnValue({
      isPending: false,
      isRefetching: false,
      isError: true,
      data: null,
    });

    render(<IssuesDetailsPage />);

    expect(
      screen.getByText("Failed to load issues. Please try again later.")
    ).toBeInTheDocument();
  });

  it("renders empty state when no issues found", () => {
    const { useIssues } = require("@/hooks/help/useIssues");

    useIssues.mockReturnValue({
      isPending: false,
      isRefetching: false,
      isError: false,
      data: {
        data: {
          items: [],
          total: 0,
          page: 1,
          page_size: 10,
        },
      },
    });

    render(<IssuesDetailsPage />);

    expect(screen.getByText("No issues found")).toBeInTheDocument();
  });

  it("renders issues list successfully", () => {
    const { useIssues } = require("@/hooks/help/useIssues");

    useIssues.mockReturnValue({
      isPending: false,
      isRefetching: false,
      isError: false,
      data: {
        data: {
          items: mockIssues,
          total: 1,
          page: 1,
          page_size: 10,
        },
      },
    });

    render(<IssuesDetailsPage />);

    expect(screen.getByText("Issue One")).toBeInTheDocument();
    expect(screen.getByText("First issue description")).toBeInTheDocument();
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText(/Reported by:/)).toBeInTheDocument();
  });

  it("navigates to issue detail page when issue is clicked", () => {
    const { useIssues } = require("@/hooks/help/useIssues");

    useIssues.mockReturnValue({
      isPending: false,
      isRefetching: false,
      isError: false,
      data: {
        data: {
          items: mockIssues,
          total: 1,
          page: 1,
          page_size: 10,
        },
      },
    });

    render(<IssuesDetailsPage />);

    fireEvent.click(screen.getByText("Issue One"));

    expect(mockNavigate).toHaveBeenCalledWith(
      "/super-admin/issues/issue-1"
    );
  });

  it("handles missing optional fields safely", () => {
    const { useIssues } = require("@/hooks/help/useIssues");

    useIssues.mockReturnValue({
      isPending: false,
      isRefetching: false,
      isError: false,
      data: {
        data: {
          items: [
            {
              ...mockIssues[0],
              created_at: undefined,
              issue_type_name: undefined,
            },
          ],
          total: 1,
          page: 1,
          page_size: 10,
        },
      },
    });

    render(<IssuesDetailsPage />);

    expect(screen.getByText("Issue One")).toBeInTheDocument();
  });

  it("changes page using pagination", () => {
    const { useIssues } = require("@/hooks/help/useIssues");

    useIssues.mockReturnValue({
      isPending: false,
      isRefetching: false,
      isError: false,
      data: {
        data: {
          items: mockIssues,
          total: 20,
          page: 1,
          page_size: 10,
        },
      },
    });

    render(<IssuesDetailsPage />);

    fireEvent.click(screen.getByText("Next Page"));
  });

  it("handles back button click", () => {
    const { useIssues } = require("@/hooks/help/useIssues");

    useIssues.mockReturnValue({
      isPending: false,
      isRefetching: false,
      isError: false,
      data: {
        data: {
          items: mockIssues,
          total: 1,
          page: 1,
          page_size: 10,
        },
      },
    });

    render(<IssuesDetailsPage />);

    fireEvent.click(screen.getAllByRole("button")[0]);
  });
});
