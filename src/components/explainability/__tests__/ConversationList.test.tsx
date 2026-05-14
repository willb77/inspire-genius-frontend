/** @jest-environment jsdom */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@testing-library/jest-dom"

import { ConversationList } from "../ConversationList"

jest.mock("@/services/super-admin/explainability/explainability.service", () => ({
  listConversations: jest.fn(),
}))
import { listConversations } from "@/services/super-admin/explainability/explainability.service"

const mockList = listConversations as jest.MockedFunction<typeof listConversations>

function renderWith(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe("ConversationList", () => {
  beforeEach(() => mockList.mockReset())

  it("renders each conversation row returned by the API", async () => {
    mockList.mockResolvedValueOnce({
      status: true,
      total: 2,
      page: 1,
      limit: 25,
      pages: 1,
      data: [
        {
          session_id: "sess-abc12345",
          user_id: "u-1",
          user_email: null,
          message_count: 4,
          first_seen_at: "2026-05-13T10:00:00Z",
          last_seen_at: "2026-05-13T10:05:00Z",
          agents_involved: [{ name: "James", turn_count: 1 }],
          routing_health: "green",
        },
        {
          session_id: "sess-def67890",
          user_id: "u-2",
          user_email: null,
          message_count: 9,
          first_seen_at: "2026-05-13T09:00:00Z",
          last_seen_at: "2026-05-13T09:30:00Z",
          agents_involved: [{ name: "Echo", turn_count: 5 }],
          routing_health: "amber",
        },
      ],
    })

    renderWith(<ConversationList />)

    expect(await screen.findByTestId("conversation-row-sess-abc12345")).toBeInTheDocument()
    expect(await screen.findByTestId("conversation-row-sess-def67890")).toBeInTheDocument()
    expect(screen.getByText("green")).toBeInTheDocument()
    expect(screen.getByText("amber")).toBeInTheDocument()
  })

  it("shows the empty-state message when the list is empty", async () => {
    mockList.mockResolvedValueOnce({
      status: true,
      total: 0,
      page: 1,
      limit: 25,
      pages: 0,
      data: [],
    })

    renderWith(<ConversationList />)
    expect(
      await screen.findByText(/No conversations match these filters/i)
    ).toBeInTheDocument()
  })
})
