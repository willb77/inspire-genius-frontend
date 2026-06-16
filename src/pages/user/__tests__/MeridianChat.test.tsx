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

// G6 (PRISM rollout, 2026-06-15): replaced the legacy `useLatestPrism`
// client-side auto-attach hook with `useLoadedFrameworks()` driving the
// ProfileLoadedIndicator chip. The hook returns the list of frameworks
// the agent-engine has preloaded for this user (server-side, via the
// G3 WS handshake) — empty by default when the platform flag is OFF.
jest.mock("@/hooks/profile/useProfile", () => ({
  useLoadedFrameworks: jest.fn(() => ({
    data: [],
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
import { useLoadedFrameworks } from "@/hooks/profile/useProfile";

const mockUseLoadedFrameworks = useLoadedFrameworks as jest.MockedFunction<
  typeof useLoadedFrameworks
>;

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
    mockUseLoadedFrameworks.mockReturnValue({
      data: [],
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

describe("MeridianChat — ProfileLoadedIndicator (G6, replaces T2/T3 autoLoadPrism)", () => {
  // G6 (PRISM rollout, 2026-06-15): the legacy T2/T3 autoLoadPrism test
  // block — which asserted client-side `useLatestPrism` was called with
  // enabled=true/false and that the latest PRISM CSV was auto-attached
  // to `selectedFileIds` — was removed when MeridianChat dropped
  // `useLatestPrism` + the `autoLoadPrism` history-state hint. The
  // server-side User Profile Platform (G3 WS preload, flag
  // `AGENT_ENGINE_USER_PROFILE_PLATFORM_ENABLED`) owns profile delivery
  // now; the page just renders a tiny chip when the agent-engine has
  // preloaded frameworks for this user.
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAgentEngine.mockReturnValue(true);
    capturedDocumentsDropdownProps = {};
    mockLocationState = null;
    mockUseLoadedFrameworks.mockReturnValue({
      data: [],
      isError: false,
      error: null,
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("hides the ProfileLoadedIndicator chip when no frameworks are loaded (flag OFF, default)", async () => {
    renderPage();
    // After initial render the chip must be absent — empty list = no chip.
    await waitFor(() => {
      expect(screen.queryByTestId("profile-loaded-indicator")).toBeNull();
    });
  });

  it("renders 'Profile: PRISM' chip when one framework is loaded (flag ON, single)", async () => {
    mockUseLoadedFrameworks.mockReturnValue({
      data: [{ framework: "PRISM", latest_assessed_at: "2026-06-01T12:00:00Z" }],
      isError: false,
      error: null,
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    renderPage();
    await waitFor(() => {
      const chip = screen.getByTestId("profile-loaded-indicator");
      expect(chip.textContent).toContain("Profile:");
      expect(chip.textContent).toContain("PRISM");
    });
  });

  it("renders comma-joined names when multiple frameworks are loaded", async () => {
    mockUseLoadedFrameworks.mockReturnValue({
      data: [
        { framework: "PRISM", latest_assessed_at: "2026-06-01T12:00:00Z" },
        { framework: "MBTI", latest_assessed_at: "2026-06-02T12:00:00Z" },
      ],
      isError: false,
      error: null,
      isLoading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    renderPage();
    await waitFor(() => {
      const chip = screen.getByTestId("profile-loaded-indicator");
      expect(chip.textContent).toContain("PRISM");
      expect(chip.textContent).toContain("MBTI");
    });
  });
});
