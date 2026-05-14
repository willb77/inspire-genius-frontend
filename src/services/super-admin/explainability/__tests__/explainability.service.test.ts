/** @jest-environment jsdom */
import { agentApi } from "@/lib/agentApi"
import {
  getConversation,
  getTurn,
  listConversations,
} from "../explainability.service"

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: jest.fn() },
}))

const mockApi = agentApi as unknown as { get: jest.Mock }

describe("explainability.service", () => {
  beforeEach(() => mockApi.get.mockReset())

  it("listConversations passes filters to the conversations endpoint", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { status: true, total: 0, page: 1, limit: 25, pages: 0, data: [] } })
    await listConversations({ user_id: "u-1", agent: "James", page: 2 })
    expect(mockApi.get).toHaveBeenCalledWith("/v1/explainability/conversations", {
      params: { user_id: "u-1", agent: "James", page: 2 },
    })
  })

  it("getConversation encodes the session id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { status: true, session_id: "s 1", user_id: null, user_email: null, turns: [] } })
    await getConversation("s 1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/explainability/conversations/s%201")
  })

  it("getTurn encodes the turn id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { turn_id: "t#1", session_id: null, user_id: null, role: "assistant", agent_name: "James", content: "", sections: [], created_at: "" } })
    await getTurn("t#1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/explainability/turns/t%231")
  })
})
