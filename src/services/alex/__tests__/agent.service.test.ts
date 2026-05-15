/**
 * @jest-environment jsdom
 */
import { agentChat, agentHealth, getAgentWebSocketUrl } from "../agent.service"

const mockAxios = {
  post: jest.fn(),
  get: jest.fn(),
}

jest.mock("@/lib/agentApi", () => ({
  getApi: () => mockAxios,
}))

describe("agent.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("agentChat posts to /v1/agents/chat", async () => {
    const resp = { content: "hi", agent: "meridian", session_id: "s1", confidence: 0.9 }
    mockAxios.post.mockResolvedValueOnce({ data: resp })
    const result = await agentChat({ message: "hello" })
    expect(mockAxios.post).toHaveBeenCalledWith("/v1/agents/chat", { message: "hello" })
    expect(result).toEqual(resp)
  })

  it("agentHealth gets /v1/agents/health", async () => {
    const resp = { status: "ok", service: "agent-engine", version: "1.0" }
    mockAxios.get.mockResolvedValueOnce({ data: resp })
    const result = await agentHealth()
    expect(mockAxios.get).toHaveBeenCalledWith("/v1/agents/health")
    expect(result).toEqual(resp)
  })

  it("getAgentWebSocketUrl builds ws URL from base", () => {
    const url = getAgentWebSocketUrl("tok123")
    expect(url).toContain("ws")
    expect(url).toContain("access-token=tok123")
  })
})
