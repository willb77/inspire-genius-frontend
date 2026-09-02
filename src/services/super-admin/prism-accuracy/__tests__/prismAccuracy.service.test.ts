import { agentApi } from "@/lib/agentApi"
import {
  fetchRubric,
  getSubject,
  listConversations,
  listSubjects,
  scoreResponse,
  scoreSession,
} from "../prismAccuracy.service"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn(), post: jest.fn() } }))

const get = agentApi.get as jest.Mock
const post = agentApi.post as jest.Mock

beforeEach(() => {
  get.mockReset()
  post.mockReset()
})

describe("prismAccuracy.service", () => {
  it("every call goes to /v1/agents/prism-accuracy on agentApi", async () => {
    get.mockResolvedValue({ data: { status: true, data: [] } })
    post.mockResolvedValue({ data: { status: true, data: {} } })
    await fetchRubric()
    await listSubjects(10, " ada ")
    await listConversations({ user_id: "u-1", search: "lead" })
    await getSubject("u 1", 8)
    await scoreResponse({ subject_user_id: "u-1", response_text: "x" })
    await scoreSession({ session_id: "s-1" })
    for (const call of [...get.mock.calls, ...post.mock.calls]) {
      expect(String(call[0])).toMatch(/^\/v1\/agents\/prism-accuracy/)
    }
    expect(get).toHaveBeenCalledWith("/v1/agents/prism-accuracy/subjects/u%201", { params: { salient_k: 8 } })
    expect(get).toHaveBeenCalledWith("/v1/agents/prism-accuracy/subjects", { params: { limit: 10, search: "ada" } })
    expect(get).toHaveBeenCalledWith("/v1/agents/prism-accuracy/conversations", { params: { user_id: "u-1", search: "lead", limit: 30 } })
    expect(post).toHaveBeenCalledWith("/v1/agents/prism-accuracy/score", { subject_user_id: "u-1", response_text: "x" })
  })

  it("unwraps the envelope", async () => {
    get.mockResolvedValue({ data: { status: true, data: { name: "PRISM Accuracy Scorer" } } })
    await expect(fetchRubric()).resolves.toEqual({ name: "PRISM Accuracy Scorer" })
  })
})
