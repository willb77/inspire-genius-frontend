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
jest.mock("@/lib/agentApi", () => ({
  useAgentEngine: () => mockUseAgentEngine(),
  agentApi: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: { headers: { common: {} } },
  },
  getApi: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
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
jest.mock("@/hooks/agents/useMeridianWebSocket", () => ({
  useMeridianWebSocket: () => ({
    isConnected: false,
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

jest.mock("@/components/user/chat/ChatHistory", () => ({
  __esModule: true,
  default: () => (
    <div data-testid="chat-history">ChatHistory</div>
  ),
}));

jest.mock("@/components/user/chat/ChatWindow", () => ({
  __esModule: true,
  default: () => (
    <div data-testid="chat-window">ChatWindow</div>
  ),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/meridian/chat" }),
}));

/* ---- Imports (after mocks) ---- */

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import MeridianChat from "../MeridianChat";

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

  it("renders ChatHistory component", () => {
    renderPage();
    expect(screen.getByTestId("chat-history")).toBeInTheDocument();
  });

  it("renders ChatWindow component", () => {
    renderPage();
    expect(screen.getByTestId("chat-window")).toBeInTheDocument();
  });

  it("renders UserLayout even when agent engine is off", () => {
    mockUseAgentEngine.mockReturnValue(false);
    renderPage();
    // Page renders normally regardless of agent engine toggle
    expect(screen.getByTestId("user-layout")).toBeInTheDocument();
  });
});
