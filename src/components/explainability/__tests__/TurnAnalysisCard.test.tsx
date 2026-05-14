/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import { TurnAnalysisCard } from "../TurnAnalysisCard"

jest.mock("@/services/super-admin/explainability/explainability.service", () => ({
  getTurn: jest.fn(),
}))
import { getTurn } from "@/services/super-admin/explainability/explainability.service"

const mockGet = getTurn as jest.MockedFunction<typeof getTurn>

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe("TurnAnalysisCard", () => {
  beforeEach(() => mockGet.mockReset())

  it("renders the empty state when no turn id is supplied", () => {
    renderWith(<TurnAnalysisCard />)
    expect(screen.getByTestId("turn-analysis-empty")).toBeInTheDocument()
  })

  it("renders all five analysis sections when data is loaded", async () => {
    mockGet.mockResolvedValueOnce({
      turn_id: "turn-1",
      session_id: "sess-1",
      user_id: "u-1",
      role: "assistant",
      agent_name: "James",
      content: "Tracy fits well",
      created_at: "2026-05-13T10:00:00Z",
      sections: [
        {
          title: "Which agent responded",
          agent_name: "James",
          contributing_agents: ["James", "Aura"],
          synthesized: true,
        },
        {
          title: "Why this agent",
          routing_trace: { intent: "business", intent_score: 0.82, reason: "job_blueprint keyword + admin role" },
          summary: "intent='business', score=0.82",
          template_id: "job_blueprint_v2",
        },
        {
          title: "What data was used",
          rag_sources: [
            { document_id: "doc-1", filename: "tracy.pdf", similarity: 0.92, scope: "personal" },
          ],
          memory_recall: [
            { tier: "long_term", session_id: "sess-1", age_seconds: 60, content: "Tracy completed senior architect interview." },
          ],
          file_ids: [],
          source_count: 1,
          memory_count: 1,
        },
        { title: "Where it could go wrong", flags: ["Low routing confidence (0.40)"], ok: false },
        {
          title: "What the design intended",
          agent_role: "Admin tasks and Job Blueprint career fit.",
          agent_domain: "business",
          agent_access: "admin+",
          template_id: null,
          note: "Specialist output is synthesised by Meridian before delivery to the user.",
        },
      ],
    })

    renderWith(<TurnAnalysisCard turnId="turn-1" />)

    expect(await screen.findByText(/1\. Which agent responded/i)).toBeInTheDocument()
    expect(mockGet).toHaveBeenCalledWith("turn-1")
    expect(screen.getByText(/2\. Why this agent/i)).toBeInTheDocument()
    expect(screen.getByText(/3\. What data was used/i)).toBeInTheDocument()
    expect(screen.getByText(/4\. Where it could go wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/5\. What the design intended/i)).toBeInTheDocument()
    expect(screen.getByText(/Low routing confidence/i)).toBeInTheDocument()
    expect(screen.getByText(/Admin tasks and Job Blueprint career fit/i)).toBeInTheDocument()
  })
})
