/**
 * @jest-environment jsdom
 */
import { getPrompts, savePrompt, updatePrompt, getPromptVersions } from "../prompt-builder.service"
import type { SavePromptPayload } from "@/types/prompt-builder"

jest.mock("@/lib/agentApi", () => {
  const _get = jest.fn()
  const _post = jest.fn()
  const _put = jest.fn()
  return {
    __esModule: true,
    getApi: jest.fn(() => ({ get: _get, post: _post, put: _put })),
    agentApi: { get: _get, post: _post, put: _put, defaults: { headers: { common: {} } } },
    useAgentEngine: jest.fn().mockReturnValue(false),
    syncAuthToken: jest.fn(),
  }
})

// Re-import the mock to get the actual jest.fn() instances
import { getApi } from "@/lib/agentApi"
const mockApiInstance = (getApi as jest.Mock)()

describe("prompt-builder.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("getPrompts fetches agents from /v1/agents-settings/agents", async () => {
    mockApiInstance.get.mockResolvedValueOnce({
      data: { status: true, data: { agents: [{ id: "a1", name: "Agent 1", prompts: [], created_at: "" }] } },
    })
    const result = await getPrompts()
    expect(mockApiInstance.get).toHaveBeenCalledWith("/v1/agents-settings/agents", { params: { page: 1, page_size: 100 } })
    expect(result.status).toBe(true)
    expect(result.data?.items).toHaveLength(1)
  })

  it("savePrompt puts to /v1/agents-settings/agents", async () => {
    const payload: SavePromptPayload = {
      coach_id: "c1",
      persona: "You are a coach",
      tone: "",
      knowledge_domain: "",
      response_style: "",
      constraints: "",
    }
    mockApiInstance.put.mockResolvedValueOnce({ data: { status: true, message: "updated" } })
    const result = await savePrompt(payload)
    expect(mockApiInstance.put).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      { prompt: "## Persona\nYou are a coach" },
      { params: { agent_id: "c1" } },
    )
    expect(result.data?.id).toBe("c1")
  })

  it("updatePrompt puts to /v1/agents-settings/agents with agent_id", async () => {
    const payload: SavePromptPayload = {
      coach_id: "c1",
      persona: "Updated",
      tone: "",
      knowledge_domain: "",
      response_style: "",
      constraints: "",
    }
    mockApiInstance.put.mockResolvedValueOnce({ data: { status: true, message: "updated" } })
    await updatePrompt("p1", payload)
    expect(mockApiInstance.put).toHaveBeenCalledWith(
      "/v1/agents-settings/agents",
      { prompt: "## Persona\nUpdated" },
      { params: { agent_id: "c1" } },
    )
  })

  it("getPromptVersions gets agent data and extracts prompts", async () => {
    mockApiInstance.get.mockResolvedValueOnce({
      data: {
        data: {
          agents: [{
            id: "c1",
            name: "Coach 1",
            prompts: [{ id: "p1", content: "## Persona\nYou are a coach", created_at: "2024-01-01" }],
            system_prompt: "",
            created_at: "",
          }],
        },
      },
    })
    const result = await getPromptVersions("c1")
    expect(result.data?.versions).toHaveLength(1)
    expect(result.data?.versions[0].persona).toBe("You are a coach")
  })
})
