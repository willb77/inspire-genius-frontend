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

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import UserMemoryPage from "../UserMemory"
import * as memoryService from "@/services/privacy/memory.service"
import type { MemorySnapshot } from "@/types/memory"

jest.mock("@/services/privacy/memory.service")

const mockedService = memoryService as jest.Mocked<typeof memoryService>

const SAMPLE: MemorySnapshot = {
  user_id: "target-42",
  tiers: {
    long_term: {
      insights: [{ id: "i1", key: "tone", value: "warm" }],
      milestones: [],
      prism: null,
    },
    short_term: { session_summaries: [], conversation_history: [] },
    semantic: { entries: [], count: 0 },
  },
}

function renderAt(path = "/super-admin/users/target-42/memory") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/super-admin/users/:userId/memory" element={<UserMemoryPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("Super-admin UserMemory page", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the operator-view header with the target user id", async () => {
    mockedService.getUserMemory.mockResolvedValue(SAMPLE)
    renderAt()
    expect(await screen.findByText(/Memory for user/i)).toBeInTheDocument()
    expect(screen.getByText("target-42")).toBeInTheDocument()
  })

  it("calls getUserMemory with the userId from the route param", async () => {
    mockedService.getUserMemory.mockResolvedValue(SAMPLE)
    renderAt()
    await screen.findByText(/Memory for user/i)
    expect(mockedService.getUserMemory).toHaveBeenCalledWith("target-42")
  })

  it("shows the destructive 'Delete all memory' button", async () => {
    mockedService.getUserMemory.mockResolvedValue(SAMPLE)
    renderAt()
    expect(
      await screen.findByRole("button", { name: /delete all memory/i }),
    ).toBeInTheDocument()
  })
})
