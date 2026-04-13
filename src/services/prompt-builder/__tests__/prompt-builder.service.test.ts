/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { getPrompts, savePrompt, updatePrompt, getPromptVersions } from "../prompt-builder.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("prompt-builder.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("getPrompts gets /v1/prompts", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { prompts: [] } } })
    await getPrompts()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/prompts")
  })

  it("savePrompt posts to /v1/prompts", async () => {
    const payload = { coach_id: "c1", prompt_text: "You are a coach" } as never
    mockApi.post.mockResolvedValueOnce({ data: { data: { id: "p1" } } })
    await savePrompt(payload)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/prompts", payload)
  })

  it("updatePrompt puts to /v1/prompts/:id", async () => {
    const payload = { coach_id: "c1", prompt_text: "Updated" } as never
    mockApi.put.mockResolvedValueOnce({ data: { data: { id: "p1" } } })
    await updatePrompt("p1", payload)
    expect(mockApi.put).toHaveBeenCalledWith("/v1/prompts/p1", payload)
  })

  it("getPromptVersions gets versions for coach", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { versions: [] } } })
    await getPromptVersions("c1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/prompts/c1/versions")
  })
})
