/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { getPrompts, savePrompt, updatePrompt, getPromptVersions } from "../prompt-builder.service"
import type { SavePromptPayload } from "@/types/prompt-builder"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("prompt-builder.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("getPrompts gets /v1/admin/prompts", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { items: [], total: 0 } } })
    await getPrompts()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/admin/prompts")
  })

  it("savePrompt posts to /v1/admin/prompts with query params", async () => {
    const payload: SavePromptPayload = { coach_id: "c1", persona: "You are a coach", tone: "", knowledge_domain: "", response_style: "", constraints: "" }
    mockApi.post.mockResolvedValueOnce({ data: { data: { id: "p1" } } })
    await savePrompt(payload)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/admin/prompts", null, {
      params: {
        name: "prompt-c1",
        template_text: "## Persona\nYou are a coach",
        agent_id: "c1",
      },
    })
  })

  it("updatePrompt puts to /v1/admin/prompts/:id with query params", async () => {
    const payload: SavePromptPayload = { coach_id: "c1", persona: "Updated", tone: "", knowledge_domain: "", response_style: "", constraints: "" }
    mockApi.put.mockResolvedValueOnce({ data: { data: { id: "p1" } } })
    await updatePrompt("p1", payload)
    expect(mockApi.put).toHaveBeenCalledWith("/v1/admin/prompts/p1", null, {
      params: {
        template_text: "## Persona\nUpdated",
      },
    })
  })

  it("getPromptVersions gets versions filtered by agent_id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { items: [], total: 0 } } })
    await getPromptVersions("c1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/admin/prompts", { params: { agent_id: "c1" } })
  })
})
