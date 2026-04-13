/**
 * @jest-environment jsdom
 */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FeedbackHistory from "../FeedbackHistory";
import { useFeedbackList, useFeedbackStats } from "@/hooks/feedback/useFeedback";

/* ---- Mocks ---- */

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="data-card">
      <span>{title}</span>
      {children}
    </div>
  ),
}));

jest.mock("@/hooks/feedback/useFeedback", () => ({
  useFeedbackList: jest.fn(),
  useFeedbackStats: jest.fn(),
}));

const mockUseFeedbackList = useFeedbackList as jest.MockedFunction<typeof useFeedbackList>;
const mockUseFeedbackStats = useFeedbackStats as jest.MockedFunction<typeof useFeedbackStats>;

/* ---- Helpers ---- */

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

const MOCK_FEEDBACK = [
  {
    id: "f1",
    message_id: "m1",
    conversation_id: "c1",
    coach_id: "coach-1",
    user_id: "u1",
    rating: 5 as const,
    correction_text: null,
    created_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "f2",
    message_id: "m2",
    conversation_id: "c2",
    coach_id: "coach-2",
    user_id: "u1",
    rating: 2 as const,
    correction_text: "Wrong answer",
    created_at: "2026-03-02T14:00:00Z",
  },
];

/* ---- Tests ---- */

describe("FeedbackHistory Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseFeedbackList.mockReturnValue({
      data: {
        data: {
          feedback: MOCK_FEEDBACK,
          pagination: { total: 2, page: 1, limit: 10, has_more: false },
        },
      },
      isLoading: false,
      isError: false,
    } as any);

    mockUseFeedbackStats.mockReturnValue({
      data: {
        data: {
          total_count: 42,
          avg_rating: 4.2,
          rating_distribution: { "5": 20, "4": 10, "3": 5, "2": 4, "1": 3 },
          top_corrections: [],
        },
      },
      isLoading: false,
    } as any);
  });

  it("renders page title", () => {
    render(<FeedbackHistory />, { wrapper: createWrapper() });
    expect(screen.getByText("Feedback History")).toBeInTheDocument();
  });

  it("renders summary stats", () => {
    render(<FeedbackHistory />, { wrapper: createWrapper() });
    expect(screen.getByText("42")).toBeInTheDocument(); // total_count
    expect(screen.getByText("4.2 / 5")).toBeInTheDocument(); // avg_rating
  });

  it("renders feedback table with entries", () => {
    render(<FeedbackHistory />, { wrapper: createWrapper() });
    expect(screen.getByText("coach-1")).toBeInTheDocument();
    expect(screen.getByText("coach-2")).toBeInTheDocument();
    expect(screen.getByText("Wrong answer")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUseFeedbackList.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as any);

    render(<FeedbackHistory />, { wrapper: createWrapper() });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockUseFeedbackList.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as any);

    render(<FeedbackHistory />, { wrapper: createWrapper() });
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it("shows empty state when no feedback", () => {
    mockUseFeedbackList.mockReturnValue({
      data: {
        data: {
          feedback: [],
          pagination: { total: 0, page: 1, limit: 10, has_more: false },
        },
      },
      isLoading: false,
      isError: false,
    } as any);

    render(<FeedbackHistory />, { wrapper: createWrapper() });
    expect(screen.getByText("No feedback found")).toBeInTheDocument();
  });

  it("renders rating filter dropdown", () => {
    render(<FeedbackHistory />, { wrapper: createWrapper() });
    // The select element contains rating filter options
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
  });

  it("shows loading state for stats", () => {
    mockUseFeedbackStats.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<FeedbackHistory />, { wrapper: createWrapper() });
    // Stats cards show animated pulse during loading
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });

  it("renders star rating badges for each entry", () => {
    render(<FeedbackHistory />, { wrapper: createWrapper() });
    // Rating of 5 = "Positive", Rating of 2 = "Negative"
    expect(screen.getByText("Positive")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<FeedbackHistory />, { wrapper: createWrapper() });
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Coach")).toBeInTheDocument();
    expect(screen.getByText("Rating")).toBeInTheDocument();
    expect(screen.getByText("Sentiment")).toBeInTheDocument();
    expect(screen.getByText("Correction")).toBeInTheDocument();
  });
});
