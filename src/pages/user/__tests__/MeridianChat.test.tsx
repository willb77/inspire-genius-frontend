/**
 * @jest-environment jsdom
 */

/* ---- Module mocks (must be before imports) ---- */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: { baseURL: "http://localhost:3000" },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    defaults: { baseURL: "http://localhost:3000" },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
  attachInterceptors: jest.fn(),
}));

const mockUseAgentEngine = jest.fn();
// Stable mocked axios instance shared by `agentApi` and `getApi()` so
// tests can assert against a single set of mocked calls — the
// async-jobs path goes through `getApi()`.
const mockSharedApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: { headers: { common: {} } },
};
jest.mock("@/lib/agentApi", () => ({
  useAgentEngine: () => mockUseAgentEngine(),
  agentApi: mockSharedApi,
  getApi: () => mockSharedApi,
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user", fullName: "Test User", name: "Test", email: "test@test.com", role: "user", token: "test-token" },
    isAuthenticated: true,
    hasRole: jest.fn(() => true),
    accessToken: "test-token",
  }),
}));

jest.mock("@/context/useTour", () => ({
  useTour: () => ({ isRunning: false }),
}));

const mockWsConnect = jest.fn();
const mockWsDisconnect = jest.fn();
const mockSendMessage = jest.fn();
const mockStartRecording = jest.fn();
const mockStopRecording = jest.fn();
// Mutable connection flag so individual tests can simulate "WS open" vs
// "WS not yet open" without re-mocking the module.
let mockIsConnected = true;
jest.mock("@/hooks/agents/useMeridianWebSocket", () => ({
  useMeridianWebSocket: () => ({
    isConnected: mockIsConnected,
    isConnecting: false,
    isProcessing: false,
    error: null,
    serverSessionId: null,
    currentAgent: null,
    currentDomain: null,
    currentResponse: "",
    connect: mockWsConnect,
    disconnect: mockWsDisconnect,
    sendMessage: mockSendMessage,
    startVoice: jest.fn(),
    stopVoice: jest.fn(),
    sendAudioChunk: jest.fn(),
    isRecording: false,
    startRecording: mockStartRecording,
    stopRecording: mockStopRecording,
  }),
}));

jest.mock("@/hooks/agents/useAgentConversation", () => ({
  useAgentConversation: jest.fn(() => ({
    data: { data: { conversations: [], total_count: 0 } },
    isLoading: false,
  })),
}));

jest.mock("@/hooks/agents/useCreateConversation", () => ({
  useCreateConversation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue({ data: { conversation: { id: "conv-1" } } }),
    isPending: false,
  })),
}));

jest.mock("@/hooks/agents/useConversationMessagesInfinite", () => ({
  useConversationMessagesInfinite: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  })),
}));

jest.mock("@/hooks/agents/useDeleteConversation", () => ({
  useDeleteConversation: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  })),
}));

jest.mock("@/hooks/agents/useRenameConversation", () => ({
  useRenameConversation: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
    isPending: false,
  })),
}));

jest.mock("@/services/agent/agentService", () => ({
  getAgentConversation: jest.fn().mockResolvedValue({ data: { data: [] } }),
  createConversation: jest.fn().mockResolvedValue({ data: { data: { id: "conv-1" } } }),
  getConversationDetail: jest.fn().mockResolvedValue({ data: { data: [] } }),
  deleteConversation: jest.fn().mockResolvedValue({}),
  renameConversation: jest.fn().mockResolvedValue({}),
  exportConversation: jest.fn().mockResolvedValue({}),
}));

jest.mock("@/services/demoAudioService", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      initializeAudioContext: jest.fn().mockResolvedValue(undefined),
      addAudioChunk: jest.fn(),
      getCombinedAudioBuffer: jest.fn().mockResolvedValue(null),
      resetAudioState: jest.fn(),
      pauseAudio: jest.fn(),
      resumeAudio: jest.fn(),
      getAudioContext: jest.fn(() => null),
      speaking: false,
    })),
  };
});

jest.mock("@/lib/secureStorage", () => ({
  secureGetItem: jest.fn().mockResolvedValue(null),
  secureSetItem: jest.fn().mockResolvedValue(undefined),
  secureRemoveItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/hooks/documents/useListDocuments", () => ({
  useListDocuments: jest.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}));

jest.mock("@/hooks/documents/useLatestPrism", () => ({
  useLatestPrism: jest.fn(() => ({
    data: undefined,
    isError: false,
    error: null,
    isLoading: false,
  })),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  Toaster: () => null,
}));

jest.mock("@/hooks/documents/useDownloadDocument", () => ({
  useDownloadDocument: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue(""),
  })),
}));

jest.mock("@/hooks/documents/useDeleteDocument", () => ({
  useDeleteDocument: jest.fn(() => ({
    mutateAsync: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

// ChatHistory mock retained as no-op — the page no longer imports it
// after the T6 rework, but tests for revert paths may reintroduce it.
jest.mock("@/components/user/chat/ChatHistory", () => ({
  __esModule: true,
  default: () => null,
}));

// T4/T5 — the dropdowns replace the side-panel ChatHistory. Stub them
// so MeridianChat tests don't pull in Radix portals (jsdom can render
// the trigger only; the body lives in a portal). Each captures the
// props the page passed for layout assertions.
let capturedDocumentsDropdownProps: Record<string, unknown> = {};
let capturedHistoryDropdownProps: Record<string, unknown> = {};
jest.mock("@/components/meridian/DocumentsDropdown", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    capturedDocumentsDropdownProps = props;
    return <div data-testid="documents-dropdown" />;
  },
}));
jest.mock("@/components/meridian/HistoryDropdown", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    capturedHistoryDropdownProps = props;
    return <div data-testid="history-dropdown" />;
  },
}));

// ChatWindow mock captures onSendText so we can test file_ids passing
let capturedChatWindowProps: Record<string, unknown> = {};
jest.mock("@/components/user/chat/ChatWindow", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    capturedChatWindowProps = props;
    return <div data-testid="chat-window">ChatWindow</div>;
  },
}));

const mockNavigate = jest.fn();
let mockLocationState: Record<string, unknown> | null = null;
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/meridian/chat", state: mockLocationState }),
}));

/* ---- Imports (after mocks) ---- */

import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import MeridianChat from "../MeridianChat";
import { useLatestPrism } from "@/hooks/documents/useLatestPrism";
import { toast } from "sonner";

const mockUseLatestPrism = useLatestPrism as jest.MockedFunction<typeof useLatestPrism>;

/* ---- Helpers ---- */

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/meridian/chat"]}>
        <MeridianChat />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ---- Tests ---- */

describe("MeridianChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentEngine.mockReturnValue(true);
    mockLocationState = null;
    capturedDocumentsDropdownProps = {};
    mockUseLatestPrism.mockReturnValue({
      data: undefined,
      isError: false,
      error: null,
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("renders even when Agent Engine toggle is OFF", () => {
    mockUseAgentEngine.mockReturnValue(false);
    renderPage();
    // Page no longer redirects — it works regardless of toggle
    expect(screen.getByText("Meridian")).toBeTruthy();
  });

  it("renders when Agent Engine toggle is ON", () => {
    mockUseAgentEngine.mockReturnValue(true);
    renderPage();
    expect(screen.getByText("Meridian")).toBeTruthy();
  });

  it("renders the page with Meridian title", () => {
    renderPage();
    expect(screen.getByText("Meridian")).toBeTruthy();
  });

  it("renders within UserLayout", () => {
    renderPage();
    expect(screen.getByTestId("user-layout")).toBeInTheDocument();
  });

  it("renders the DocumentsDropdown and HistoryDropdown (T4/T5)", () => {
    renderPage();
    expect(screen.getByTestId("documents-dropdown")).toBeInTheDocument();
    expect(screen.getByTestId("history-dropdown")).toBeInTheDocument();
  });

  it("renders ChatWindow component", () => {
    renderPage();
    expect(screen.getByTestId("chat-window")).toBeInTheDocument();
  });

  it("wires selectedFileIds + setter into DocumentsDropdown (T4)", () => {
    renderPage();
    expect(capturedDocumentsDropdownProps).toHaveProperty("selectedIds");
    expect(capturedDocumentsDropdownProps).toHaveProperty("onChange");
    expect(Array.isArray(capturedDocumentsDropdownProps.selectedIds)).toBe(true);
  });

  it("wires active conversation + select handler into HistoryDropdown (T5)", () => {
    renderPage();
    expect(capturedHistoryDropdownProps).toHaveProperty("activeId");
    expect(capturedHistoryDropdownProps).toHaveProperty("onSelectActive");
    expect(typeof capturedHistoryDropdownProps.onSelectActive).toBe("function");
  });

  it("renders UserLayout even when agent engine is off", () => {
    mockUseAgentEngine.mockReturnValue(false);
    renderPage();
    // Page renders normally regardless of agent engine toggle
    expect(screen.getByTestId("user-layout")).toBeInTheDocument();
  });
});

describe("MeridianChat — text send via async-jobs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentEngine.mockReturnValue(true);
    capturedChatWindowProps = {};
    mockIsConnected = true;
    // Default mock for any async-jobs POST/GET fired by the hook so
    // tests don't crash when the hook starts polling. Each test can
    // override with mockResolvedValueOnce if it needs a specific shape.
    mockSharedApi.post.mockResolvedValue({
      data: { job_id: "job-test-1", session_id: "sess-1", status: "queued" },
    });
    mockSharedApi.get.mockResolvedValue({
      data: { job_id: "job-test-1", session_id: "sess-1", status: "queued", message: "" },
    });
  });

  it("passes onSendText callback to ChatWindow", () => {
    renderPage();
    expect(capturedChatWindowProps).toHaveProperty("onSendText");
    expect(typeof capturedChatWindowProps.onSendText).toBe("function");
  });

  it("routes text send through POST /v1/agents/chat/async, not the legacy REST /v1/agents/chat", async () => {
    // Regression guard for the 2026-05-18 API GW 30s integration-cap
    // outage: REST POST /v1/agents/chat must never carry text chat.
    // The async-jobs path uses a different endpoint that is not capped.
    renderPage();

    const onSendText = capturedChatWindowProps.onSendText as (t: string) => void;
    await act(async () => {
      onSendText("Hello Meridian");
      await new Promise((r) => setTimeout(r, 0));
    });

    // Text-send now goes via POST /v1/agents/chat/async, not WS sendMessage.
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockSharedApi.post).toHaveBeenCalledWith(
      "/v1/agents/chat/async",
      expect.objectContaining({
        message: "Hello Meridian",
        session_id: expect.any(String),
      }),
    );
    // The legacy REST chat endpoint (the one the 30s cap kills) must
    // never be invoked from the text-send path.
    expect(mockSharedApi.post).not.toHaveBeenCalledWith(
      "/v1/agents/chat",
      expect.anything(),
      expect.anything(),
    );
  });

  it("still posts the async-job when the WS is closed (no queue dependency)", async () => {
    mockIsConnected = false;

    renderPage();

    const onSendText = capturedChatWindowProps.onSendText as (t: string) => void;
    await act(async () => {
      onSendText("No-socket message");
      await new Promise((r) => setTimeout(r, 0));
    });

    // The async-jobs path is REST-only — WS connection state does not
    // gate it. We DO still kick a WS (re)connect in the background so
    // push frames land when the job settles, but acceptance is independent.
    expect(mockSharedApi.post).toHaveBeenCalledWith(
      "/v1/agents/chat/async",
      expect.objectContaining({ message: "No-socket message" }),
    );
    expect(mockWsConnect).toHaveBeenCalled();
    // No REST fallback to the 30s-capped endpoint.
    expect(mockSharedApi.post).not.toHaveBeenCalledWith(
      "/v1/agents/chat",
      expect.anything(),
      expect.anything(),
    );
  });
});

describe("MeridianChat — autoLoadPrism (T2/T3)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentEngine.mockReturnValue(true);
    capturedDocumentsDropdownProps = {};
    mockLocationState = null;
    mockUseLatestPrism.mockReturnValue({
      data: undefined,
      isError: false,
      error: null,
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("does NOT call useLatestPrism with enabled=true when autoLoadPrism flag is absent", () => {
    mockLocationState = null;
    renderPage();
    // The hook is always mocked / called, but it must be called with enabled:false.
    expect(mockUseLatestPrism).toHaveBeenCalled();
    const call = mockUseLatestPrism.mock.calls[0][0];
    expect(call?.enabled).toBe(false);
  });

  it("auto-attaches the latest PRISM document_id to selectedFileIds when autoLoadPrism=true + 200", async () => {
    mockLocationState = { autoLoadPrism: true };
    mockUseLatestPrism.mockReturnValue({
      data: {
        document_id: "prism-doc-123",
        file_name: "prism_results.csv",
        uploaded_at: "2026-06-01T12:00:00Z",
      },
      isError: false,
      error: null,
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    renderPage();

    // The hook should have been invoked with enabled:true via the flag gate.
    const call = mockUseLatestPrism.mock.calls[0][0];
    expect(call?.enabled).toBe(true);

    // After mount the auto-attach effect runs and the document_id lands
    // in DocumentsDropdown's selectedIds.
    await waitFor(() => {
      expect(
        (capturedDocumentsDropdownProps.selectedIds as string[]) ?? [],
      ).toContain("prism-doc-123");
    });

    // The dropdown should also receive the auto-attached id so it can
    // render the "Auto-attached" badge.
    expect(capturedDocumentsDropdownProps.autoAttachedId).toBe("prism-doc-123");

    // A success toast announces the auto-attach.
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("prism_results.csv"),
    );

    // The flag is cleared from history state so a refresh doesn't re-trigger.
    expect(mockNavigate).toHaveBeenCalledWith(
      "/meridian/chat",
      expect.objectContaining({ replace: true, state: {} }),
    );
  });

  it("silently falls through when latest-prism returns 404 (no PRISM uploaded)", async () => {
    mockLocationState = { autoLoadPrism: true };
    mockUseLatestPrism.mockReturnValue({
      data: undefined,
      isError: true,
      error: { response: { status: 404 } },
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    renderPage();

    // Wait for the effect to run (history.replaceState fires).
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        "/meridian/chat",
        expect.objectContaining({ replace: true, state: {} }),
      );
    });

    // selectedFileIds stays empty — no document was auto-attached.
    expect(
      (capturedDocumentsDropdownProps.selectedIds as string[]) ?? [],
    ).toEqual([]);
    expect(capturedDocumentsDropdownProps.autoAttachedId).toBeNull();

    // No toast — 404 is a normal first-time-user state, not an error.
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does not double-attach when the effect re-runs", async () => {
    mockLocationState = { autoLoadPrism: true };
    mockUseLatestPrism.mockReturnValue({
      data: {
        document_id: "prism-doc-456",
        file_name: "prism.csv",
        uploaded_at: "2026-06-01T12:00:00Z",
      },
      isError: false,
      error: null,
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { rerender } = renderPage();

    await waitFor(() => {
      expect(
        (capturedDocumentsDropdownProps.selectedIds as string[]) ?? [],
      ).toContain("prism-doc-456");
    });

    const initialCount = (
      capturedDocumentsDropdownProps.selectedIds as string[]
    ).filter((id) => id === "prism-doc-456").length;
    expect(initialCount).toBe(1);

    // Force a rerender — the effect must not append the same id again.
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/meridian/chat"]}>
          <MeridianChat />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const afterCount = (
      capturedDocumentsDropdownProps.selectedIds as string[]
    ).filter((id) => id === "prism-doc-456").length;
    expect(afterCount).toBe(1);
  });
});
