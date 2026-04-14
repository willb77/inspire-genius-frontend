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
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../Dashboard";
import { useAgents } from "@/hooks/coaches/useAgents";

/* ---- Mocks ---- */

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

jest.mock("@/components/user/UserCoachCard", () => ({
  __esModule: true,
  default: ({ title, onChat }: { title: string; onChat: () => void }) => (
    <div data-testid={`coach-card-${title}`}>
      <span>{title}</span>
      <button onClick={onChat}>Chat</button>
    </div>
  ),
}));

jest.mock("@/components/shared/CoachCardSkeleton", () => ({
  __esModule: true,
  default: () => <div data-testid="coach-skeleton" />,
}));

jest.mock("@/hooks/coaches/useAgents", () => ({
  useAgents: jest.fn(),
}));

const mockUseAgents = useAgents as jest.MockedFunction<typeof useAgents>;
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

/* ---- Helpers ---- */

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

const MOCK_AGENTS = [
  { id: "a1", name: "PRISM Coach", user_gender: { id: "g1", name: "Female" }, user_accent: { id: "ac1", name: "British" }, user_tones: [{ id: "t1", name: "Calm" }] },
  { id: "a2", name: "Training Coach", user_gender: null, user_accent: null, user_tones: null },
];

/* ---- Tests ---- */

describe("Dashboard Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgents.mockReturnValue({
      data: { data: MOCK_AGENTS },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    } as any);
  });

  it("renders page title", () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText("Choose a coach to chat")).toBeInTheDocument();
  });

  it("renders coach cards from API data", () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText("PRISM Coach")).toBeInTheDocument();
    expect(screen.getByText("Training Coach")).toBeInTheDocument();
  });

  it("shows loading skeletons when loading", () => {
    mockUseAgents.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getAllByTestId("coach-skeleton")).toHaveLength(3);
  });

  it("shows error state with retry button", () => {
    const refetchMock = jest.fn();
    mockUseAgents.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "Network error" },
      refetch: refetchMock,
    } as any);

    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText("Failed to load coaches")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Retry"));
    expect(refetchMock).toHaveBeenCalled();
  });

  it("shows empty state when no coaches", () => {
    mockUseAgents.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    } as any);

    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText("No coaches available")).toBeInTheDocument();
  });

  it("filters coaches by search query", () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "prism" } });

    expect(screen.getByText("PRISM Coach")).toBeInTheDocument();
    expect(screen.queryByText("Training Coach")).not.toBeInTheDocument();
  });

  it("shows clear search button when no match", () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: "zzzznonexistent" } });

    expect(screen.getByText("No coaches available")).toBeInTheDocument();
    expect(screen.getByText("Clear search")).toBeInTheDocument();
  });

  it("navigates to chat on coach card click", () => {
    render(<Dashboard />, { wrapper: createWrapper() });

    const chatButtons = screen.getAllByText("Chat");
    fireEvent.click(chatButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/dashboard/a1--prism-coach/chat")
    );
  });
});
