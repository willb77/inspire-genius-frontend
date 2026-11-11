import { agentApi } from "@/lib/agentApi"
import { getLearningLocal } from "@/services/career-discovery/learningLocal.service"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }))

const api = agentApi as unknown as { get: jest.Mock }

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: { status: true, data: { state: "ready", data: [] } } })
})

test("JF-10: local listings are read from the Discovery prefix on the Agent Engine, exactly the query given", async () => {
  const out = await getLearningLocal({ soc: "15-1252", kind: "licenses", state: "NC" })
  expect(api.get).toHaveBeenCalledWith("/v1/agents/career-discovery/education/local", {
    params: { soc: "15-1252", kind: "licenses", state: "NC" },
  })
  expect(out).toEqual({ status: true, data: { state: "ready", data: [] } })
})
