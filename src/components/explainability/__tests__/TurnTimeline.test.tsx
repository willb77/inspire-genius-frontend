/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import { TurnTimeline } from "../TurnTimeline"

jest.mock("@/services/super-admin/explainability/explainability.service", () => ({
  getConversation: jest.fn(),
}))
import { getConversation } from "@/services/super-admin/explainability/explainability.service"

const mockGet = getConversation as jest.MockedFunction<typeof getConversation>

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe("TurnTimeline", () => {
  beforeEach(() => mockGet.mockReset())

  it("renders an empty prompt when no session is selected", () => {
    renderWith(<TurnTimeline />)
    expect(screen.getByTestId("turn-timeline-empty")).toBeInTheDocument()
  })

  it("renders one turn card per turn returned by the API", async () => {
    mockGet.mockResolvedValueOnce({
      status: true,
      session_id: "sess-1",
      user_id: "u-1",
      user_email: null,
      turns: [
        {
          turn_id: "turn-A",
          session_id: "sess-1",
          user_id: "u-1",
          role: "user",
          agent_name: null,
          content: "How does Tracy fit the senior architect role?",
          sections: [
            { title: "Which agent responded", agent_name: "Meridian", contributing_agents: [], synthesized: false },
            { title: "Why this agent", routing_trace: null, summary: "no trace" },
            { title: "What data was used", rag_sources: [], memory_recall: [], file_ids: [], source_count: 0, memory_count: 0 },
            { title: "Where it could go wrong", flags: [], ok: true },
            { title: "What the design intended", agent_role: "x", agent_domain: "meta", agent_access: "all", note: "x" },
          ],
          created_at: "2026-05-13T10:00:00Z",
        },
        {
          turn_id: "turn-B",
          session_id: "sess-1",
          user_id: "u-1",
          role: "assistant",
          agent_name: "James",
          content: "Tracy fits well",
          sections: [
            { title: "Which agent responded", agent_name: "James", contributing_agents: ["James"], synthesized: true },
            { title: "Why this agent", routing_trace: { intent: "business", intent_score: 0.8 }, summary: "intent='business'" },
            { title: "What data was used", rag_sources: [], memory_recall: [], file_ids: [], source_count: 1, memory_count: 0 },
            { title: "Where it could go wrong", flags: [], ok: true },
            { title: "What the design intended", agent_role: "Admin tasks", agent_domain: "business", agent_access: "admin+", note: "x" },
          ],
          created_at: "2026-05-13T10:01:00Z",
        },
      ],
    })

    renderWith(<TurnTimeline sessionId="sess-1" />)
    expect(await screen.findByTestId("turn-card-turn-A")).toBeInTheDocument()
    expect(await screen.findByTestId("turn-card-turn-B")).toBeInTheDocument()
    expect(mockGet).toHaveBeenCalledWith("sess-1")
    expect(screen.getByText("James")).toBeInTheDocument()
  })
})
