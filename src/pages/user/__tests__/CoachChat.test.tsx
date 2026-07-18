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
    defaults: { baseURL: "http://localhost:3000" },
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
  api: {
    defaults: { baseURL: "http://localhost:3000" },
  },
}));

import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CoachChat from "../CoachChat";

/* ---- Mocks ---- */

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

jest.mock("@/components/user/chat/ChatHistory", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="chat-history">
      {props.isLoading && <span data-testid="chat-history-loading" />}
      <span data-testid="has-conversations">{String(props.hasConversations)}</span>
    </div>
  ),
}));

jest.mock("@/components/user/chat/ChatWindow", () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="chat-window">
      <span data-testid="coach-name">{props.coachName}</span>
      <span data-testid="coach-id">{props.coachId}</span>
      {props.convIsLoading && <span data-testid="conv-loading" />}
    </div>
  ),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { id: "1", name: "Test", email: "test@test.com", role: "user", token: "fake-token" },
    isAuthenticated: true,
    hasRole: jest.fn(() => true),
  }),
}));

const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockSendText = jest.fn();

jest.mock("@/hooks/agents/usePrismAgentWebSocket", () => ({
  usePrismAgentWebSocket: () => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    updateSelectedFiles: jest.fn(),
    sendTextMessage: mockSendText,
    isConnected: false,
    isConnecting: false,
    isRecording: false,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    updateContinuousMute: jest.fn(),
  }),
}));

jest.mock("@/hooks/agents/useAgentConversation", () => ({
  useAgentConversation: jest.fn(() => ({
    data: { data: { conversations: [{ id: "conv-1", title: "Test Chat", created_at: "2026-01-01" }] } },
    isLoading: false,
  })),
}));

jest.mock("@/hooks/agents/useCreateConversation", () => ({
  useCreateConversation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/hooks/agents/useConversationMessagesInfinite", () => ({
  useConversationMessagesInfinite: () => ({
    data: undefined,
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
}));

jest.mock("@/hooks/agents/useDeleteConversation", () => ({
  useDeleteConversation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/hooks/agents/useRenameConversation", () => ({
  useRenameConversation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

jest.mock("@/hooks/documents/useListDocuments", () => ({
  useListDocuments: () => ({
    data: undefined,
    isLoading: false,
  }),
}));

jest.mock("@/hooks/documents/useDownloadDocument", () => ({
  useDownloadDocument: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock("@/hooks/documents/useDeleteDocument", () => ({
  useDeleteDocument: () => ({
    mutateAsync: jest.fn(),
  }),
}));

jest.mock("@/services/demoAudioService", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    resetAudioState: jest.fn(),
    initializeAudioContext: jest.fn().mockResolvedValue(undefined),
    addAudioChunk: jest.fn(),
    getCombinedAudioBuffer: jest.fn().mockResolvedValue(null),
    pauseAudio: jest.fn(),
    resumeAudio: jest.fn(),
    getAudioContext: jest.fn(),
    speaking: false,
  })),
}));

jest.mock("@/services/agent/agentService", () => ({
  exportConversation: jest.fn(),
}));

jest.mock("@/lib/secureStorage", () => ({
  secureGetItem: jest.fn().mockResolvedValue(null),
  secureSetItem: jest.fn().mockResolvedValue(undefined),
  secureRemoveItem: jest.fn().mockResolvedValue(undefined),
}));

/* ---- Helpers ---- */

const renderWithRoute = (
  coachParam = "abc123--meridian",
  variant: "classic" | "v2" = "classic",
) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/dashboard/${coachParam}/chat`]}>
        <Routes>
          <Route
            path="/dashboard/:coach/chat"
            element={<CoachChat variant={variant} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

/* ---- Tests ---- */

describe("CoachChat Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders chat history and chat window", () => {
    renderWithRoute();
    expect(screen.getByTestId("chat-history")).toBeInTheDocument();
    expect(screen.getByTestId("chat-window")).toBeInTheDocument();
  });

  it("parses coach name from URL param (double-dash format)", () => {
    renderWithRoute("abc123--meridian");
    expect(screen.getByTestId("coach-name")).toHaveTextContent("Meridian");
    expect(screen.getByTestId("coach-id")).toHaveTextContent("abc123");
  });

  it("renders inside UserLayout", () => {
    renderWithRoute();
    expect(screen.getByTestId("user-layout")).toBeInTheDocument();
  });

  it("shows conversations from API", () => {
    renderWithRoute();
    expect(screen.getByTestId("has-conversations")).toHaveTextContent("true");
  });
});

describe("CoachChat Page — V2 surface", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the V2 eyebrow + serif coach-name header", () => {
    renderWithRoute("abc123--meridian", "v2");
    expect(screen.getByText("Coaching Session")).toBeInTheDocument();
    // The coach name renders as the serif page heading in V2.
    const headings = screen.getAllByText("Meridian");
    expect(headings.length).toBeGreaterThan(0);
  });

  it("still mounts the shared chat window + history in V2", () => {
    renderWithRoute("abc123--meridian", "v2");
    expect(screen.getByTestId("chat-window")).toBeInTheDocument();
    expect(screen.getByTestId("chat-history")).toBeInTheDocument();
    expect(screen.getByTestId("user-layout")).toBeInTheDocument();
  });

  it("does not render the V2 eyebrow in the classic variant", () => {
    renderWithRoute("abc123--meridian", "classic");
    expect(screen.queryByText("Coaching Session")).not.toBeInTheDocument();
  });
});
