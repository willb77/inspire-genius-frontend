import {
  analyseProfile,
  exportProfile,
  fetchRubric,
  generateProfile,
  scoreBattery,
} from "../characterLab.service"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/agentApi", () => ({
  agentApi: { get: jest.fn(), post: jest.fn() },
}))

const get = agentApi.get as jest.Mock
const post = agentApi.post as jest.Mock

describe("characterLab.service", () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
  })

  /**
   * Only `/v1/agents/{proxy+}` has an API Gateway integration to the
   * agent-engine. A path outside it deploys green and 404s in the browser, so
   * the prefix is asserted rather than assumed.
   */
  it.each([
    ["generate", () => generateProfile({ name: "X" }), "/v1/agents/character-lab/generate"],
    ["battery", () => scoreBattery({ name: "X", group: "Core Traits", behaviours: {} }), "/v1/agents/character-lab/battery"],
    ["analyse", () => analyseProfile({ name: "X", scores: {}, colours: {} }), "/v1/agents/character-lab/analyse"],
    ["export", () => exportProfile({ name: "X", scores: {}, colours: {}, fmt: "wide" }), "/v1/agents/character-lab/export"],
  ])("posts %s under the routed /v1/agents prefix", async (_label, call, path) => {
    post.mockResolvedValue({ data: { status: true, data: { analysis: "", filename: "f", content: "" } } })
    await call()
    expect(post).toHaveBeenCalledWith(path, expect.anything())
  })

  it("fetches the rubric under the routed prefix", async () => {
    get.mockResolvedValue({ data: { status: true, data: { groups: [] } } })
    await fetchRubric()
    expect(get).toHaveBeenCalledWith("/v1/agents/character-lab/rubric")
  })

  it("unwraps the response envelope rather than returning it raw", async () => {
    post.mockResolvedValue({ data: { status: true, data: { name: "Sonny", scores: { a: { Underlying: 1 } } } } })
    const result = await generateProfile({ name: "Sonny" })
    expect(result.name).toBe("Sonny")
    expect(result).not.toHaveProperty("status")
  })

  it("passes the character through to the API unchanged", async () => {
    post.mockResolvedValue({ data: { status: true, data: {} } })
    await generateProfile({ name: "Sonny Corleone", source: "The Godfather", notes: "hot-headed" })
    expect(post).toHaveBeenCalledWith("/v1/agents/character-lab/generate", {
      name: "Sonny Corleone",
      source: "The Godfather",
      notes: "hot-headed",
    })
  })
})
