/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockUseAgentConversation = jest.fn();
jest.mock("@/hooks/agents/useAgentConversation", () => ({
  useAgentConversation: (...args: unknown[]) => mockUseAgentConversation(...args),
}));

// The delete path is exercised through the REAL useDeleteConversation hook
// (so its query invalidation stays covered); only the network call underneath
// is stubbed.
const mockDeleteConversation = jest.fn();
jest.mock("@/services/agent/agentService", () => ({
  deleteConversation: (...args: unknown[]) => mockDeleteConversation(...args),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Radix DropdownMenu — render inline as in DocumentsDropdown.test.tsx.
jest.mock("@/components/ui/dropdown-menu", () => {
  jest.requireActual("react");
  return {
    __esModule: true,
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    DropdownMenuTrigger: ({
      children,
      asChild,
    }: {
      children: React.ReactNode;
      asChild?: boolean;
    }) => (asChild ? <>{children}</> : <button>{children}</button>),
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dd-content">{children}</div>
    ),
    DropdownMenuItem: ({
      children,
      onClick,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
    }) => (
      <div role="menuitem" onClick={onClick}>
        {children}
      </div>
    ),
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuPortal: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    DropdownMenuCheckboxItem: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuShortcut: ({ children }: { children: React.ReactNode }) => (
      <span>{children}</span>
    ),
    DropdownMenuRadioGroup: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuRadioItem: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuSub: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuSubTrigger: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    DropdownMenuSubContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  };
});

import HistoryDropdown from "../HistoryDropdown";

// A QueryClientProvider is required since the row-level delete landed
// (2026-08-05): useDeleteConversation is a real mutation, unlike the mocked
// useAgentConversation above. The component always renders inside a provider
// in the app, so wrapping here keeps the harness faithful rather than mocking
// the hook away.
function renderDropdown(
  props: Partial<React.ComponentProps<typeof HistoryDropdown>> = {},
) {
  const defaults = {
    selectedIds: [] as string[],
    onChange: jest.fn(),
    activeId: null as string | null,
    onSelectActive: jest.fn(),
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HistoryDropdown {...defaults} {...props} />
    </QueryClientProvider>,
  );
}

describe("HistoryDropdown (T5)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the empty state when no conversations exist", () => {
    mockUseAgentConversation.mockReturnValue({
      data: { data: { conversations: [] } },
      isLoading: false,
      isError: false,
    });
    renderDropdown();
    expect(
      screen.getByText(/no conversations yet\. send a message/i),
    ).toBeInTheDocument();
  });

  it("renders the loading skeleton while fetching", () => {
    mockUseAgentConversation.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    renderDropdown();
    expect(screen.getByTestId("history-dropdown-loading")).toBeInTheDocument();
  });

  it("renders an error state when the fetch fails", () => {
    mockUseAgentConversation.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    renderDropdown();
    expect(
      screen.getByText(/couldn't load conversation history/i),
    ).toBeInTheDocument();
  });

  it("calls onSelectActive when a row is clicked", () => {
    mockUseAgentConversation.mockReturnValue({
      data: {
        data: {
          conversations: [
            { id: "conv-1", title: "PRISM debrief", created_at: "2026-06-10T12:00:00Z" },
            { id: "conv-2", title: "Career planning", created_at: "2026-06-11T12:00:00Z" },
          ],
        },
      },
      isLoading: false,
      isError: false,
    });
    const onSelectActive = jest.fn();
    renderDropdown({ onSelectActive });

    fireEvent.click(screen.getByTestId("history-dropdown-select-conv-1"));
    expect(onSelectActive).toHaveBeenCalledWith("conv-1");
  });

  it("calls onChange with the toggled id when a checkbox is clicked", () => {
    mockUseAgentConversation.mockReturnValue({
      data: {
        data: {
          conversations: [
            { id: "conv-1", title: "PRISM debrief", created_at: "2026-06-10T12:00:00Z" },
          ],
        },
      },
      isLoading: false,
      isError: false,
    });
    const onChange = jest.fn();
    renderDropdown({ onChange });

    const row = screen.getByTestId("history-dropdown-row-conv-1");
    const checkbox = within(row).getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(["conv-1"]);
  });

  it("marks the active conversation with an Active badge", () => {
    mockUseAgentConversation.mockReturnValue({
      data: {
        data: {
          conversations: [
            { id: "conv-1", title: "Active one", created_at: "2026-06-10T12:00:00Z" },
            { id: "conv-2", title: "Inactive one", created_at: "2026-06-09T12:00:00Z" },
          ],
        },
      },
      isLoading: false,
      isError: false,
    });
    renderDropdown({ activeId: "conv-1" });

    expect(
      screen.getByTestId("history-dropdown-active-conv-1"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("history-dropdown-active-conv-2"),
    ).not.toBeInTheDocument();
  });

  it("sorts conversations by most recent first", () => {
    mockUseAgentConversation.mockReturnValue({
      data: {
        data: {
          conversations: [
            { id: "older", title: "Older", created_at: "2026-06-01T12:00:00Z" },
            { id: "newer", title: "Newer", created_at: "2026-06-11T12:00:00Z" },
          ],
        },
      },
      isLoading: false,
      isError: false,
    });
    renderDropdown();
    const rows = screen.getAllByTestId(/history-dropdown-row-/);
    expect(rows[0]).toHaveAttribute("data-testid", "history-dropdown-row-newer");
    expect(rows[1]).toHaveAttribute("data-testid", "history-dropdown-row-older");
  });

  // ── delete (2026-08-05) ───────────────────────────────────────────────
  describe("delete", () => {
    beforeEach(() => {
      mockUseAgentConversation.mockReturnValue({
        data: {
          data: {
            conversations: [
              { id: "conv-1", title: "PRISM debrief", created_at: "2026-06-10T12:00:00Z" },
            ],
          },
        },
        isLoading: false,
        isError: false,
      });
      mockDeleteConversation.mockReset();
      mockDeleteConversation.mockResolvedValue({});
    });

    // The whole point of the two-step: deleting is irreversible and the
    // control sits next to the one that merely opens the conversation.
    it("does not delete on the first click — it only arms", () => {
      renderDropdown();
      fireEvent.click(screen.getByTestId("history-dropdown-delete-conv-1"));
      expect(mockDeleteConversation).not.toHaveBeenCalled();
      expect(
        screen.getByTestId("history-dropdown-confirm-delete-conv-1"),
      ).toBeInTheDocument();
    });

    it("deletes only after the confirm click", async () => {
      renderDropdown();
      fireEvent.click(screen.getByTestId("history-dropdown-delete-conv-1"));
      fireEvent.click(screen.getByTestId("history-dropdown-confirm-delete-conv-1"));
      await waitFor(() => {
        expect(mockDeleteConversation).toHaveBeenCalledWith("conv-1");
      });
    });

    it("disarms on cancel, leaving the conversation intact", () => {
      renderDropdown();
      fireEvent.click(screen.getByTestId("history-dropdown-delete-conv-1"));
      fireEvent.click(screen.getByTestId("history-dropdown-cancel-delete-conv-1"));
      expect(mockDeleteConversation).not.toHaveBeenCalled();
      expect(screen.getByTestId("history-dropdown-delete-conv-1")).toBeInTheDocument();
    });

    it("tells the host when the ACTIVE conversation was deleted", async () => {
      // Otherwise the chat keeps rendering a transcript the server no longer
      // has — an empty pane that looks like a load failure.
      const onDeletedActive = jest.fn();
      renderDropdown({ activeId: "conv-1", onDeletedActive });
      fireEvent.click(screen.getByTestId("history-dropdown-delete-conv-1"));
      fireEvent.click(screen.getByTestId("history-dropdown-confirm-delete-conv-1"));
      await waitFor(() => {
        expect(onDeletedActive).toHaveBeenCalledWith("conv-1");
      });
    });

    it("does not fire onDeletedActive for a non-active conversation", async () => {
      const onDeletedActive = jest.fn();
      renderDropdown({ activeId: "something-else", onDeletedActive });
      fireEvent.click(screen.getByTestId("history-dropdown-delete-conv-1"));
      fireEvent.click(screen.getByTestId("history-dropdown-confirm-delete-conv-1"));
      await waitFor(() => {
        expect(mockDeleteConversation).toHaveBeenCalled();
      });
      expect(onDeletedActive).not.toHaveBeenCalled();
    });

    it("drops a deleted conversation from the review selection", async () => {
      // A deleted id left in the selection would keep asking the chat to
      // render a conversation that no longer exists.
      const onChange = jest.fn();
      renderDropdown({ selectedIds: ["conv-1"], onChange });
      fireEvent.click(screen.getByTestId("history-dropdown-delete-conv-1"));
      fireEvent.click(screen.getByTestId("history-dropdown-confirm-delete-conv-1"));
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith([]);
      });
    });
  });
});
