/**
 * @jest-environment jsdom
 */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  },
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
  attachInterceptors: jest.fn(),
  syncAuthToken: jest.fn(),
}));

jest.mock("@/lib/agentApi", () => ({
  __esModule: true,
  agentApi: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    defaults: { headers: { common: {} } },
  },
  useAgentEngine: () => true,
  getApi: () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }),
}));

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import SettingsPrivacy from "../SettingsPrivacy"
import * as memoryService from "@/services/privacy/memory.service"
import type { MemorySnapshot } from "@/types/memory"

jest.mock("@/services/privacy/memory.service")

const mockedService = memoryService as jest.Mocked<typeof memoryService>

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <SettingsPrivacy />
    </QueryClientProvider>,
  )
}

const SAMPLE_SNAPSHOT: MemorySnapshot = {
  user_id: "user-123",
  tiers: {
    long_term: {
      insights: [
        { id: "i1", key: "preferred_topic", value: "career planning", category: "preference" },
        { id: "i2", key: "goal_focus", value: "interview prep" },
      ],
      milestones: [],
      prism: null,
    },
    short_term: {
      session_summaries: [
        { session_id: "s-1", summary: "talked about PRISM", message_count: 8 },
      ],
      conversation_history: [
        {
          session_id: "s-1",
          messages: [
            { role: "user", content: "hi" },
            { role: "assistant", content: "hello" },
          ],
        },
      ],
    },
    semantic: { entries: [], count: 3 },
  },
}

describe("SettingsPrivacy page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the heading and the section titles", async () => {
    mockedService.getMyMemory.mockResolvedValue(SAMPLE_SNAPSHOT)

    renderPage()

    expect(await screen.findByText(/Memory & Privacy/i)).toBeInTheDocument()
    expect(screen.getByText(/What we.*ve learned about you/i)).toBeInTheDocument()
    expect(screen.getByText(/Conversation history/i)).toBeInTheDocument()
    expect(screen.getByText(/Forget everything/i)).toBeInTheDocument()
  })

  it("renders each insight key from the snapshot", async () => {
    mockedService.getMyMemory.mockResolvedValue(SAMPLE_SNAPSHOT)

    renderPage()

    expect(await screen.findByText("preferred_topic")).toBeInTheDocument()
    expect(screen.getByText("goal_focus")).toBeInTheDocument()
    expect(screen.getByText("career planning")).toBeInTheDocument()
  })

  it("shows the per-tier counts in the conversation card", async () => {
    mockedService.getMyMemory.mockResolvedValue(SAMPLE_SNAPSHOT)

    renderPage()

    expect(await screen.findByText("1 session summaries")).toBeInTheDocument()
    // 2 messages across 1 session
    expect(screen.getByText(/2 stored messages across 1 sessions/i)).toBeInTheDocument()
    expect(screen.getByText("3 semantic entries")).toBeInTheDocument()
  })

  it("shows the empty-state copy when there are no insights", async () => {
    mockedService.getMyMemory.mockResolvedValue({
      user_id: "user-123",
      tiers: {
        long_term: { insights: [], milestones: [], prism: null },
        short_term: { session_summaries: [], conversation_history: [] },
        semantic: { entries: [], count: 0 },
      },
    })

    renderPage()

    await waitFor(() =>
      expect(
        screen.getByText(/No long-term insights stored yet/i),
      ).toBeInTheDocument(),
    )
  })

  it("renders the destructive 'Delete all my memory' button", async () => {
    mockedService.getMyMemory.mockResolvedValue(SAMPLE_SNAPSHOT)

    renderPage()

    expect(
      await screen.findByRole("button", { name: /delete all my memory/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /download my data/i }),
    ).toBeInTheDocument()
  })
})
