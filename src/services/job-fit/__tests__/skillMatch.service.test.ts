import { getSkillMatch, getSkillMatchEnabled } from "@/services/job-fit/skillMatch.service"
import { agentApi } from "@/lib/agentApi"
import { api } from "@/lib/axios"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }))
jest.mock("@/lib/axios", () => ({ api: { get: jest.fn() } }))
const get = agentApi.get as jest.Mock

beforeEach(() => jest.clearAllMocks())

afterEach(() => {
  // Every skills-match call goes to the agent engine, never the monolith instance.
  expect((api.get as jest.Mock).mock.calls).toHaveLength(0)
})

test("status: reads JF-11's /v1/agents/me/skills/status", async () => {
  get.mockResolvedValueOnce({ data: { status: true, data: { enabled: true } } })
  await expect(getSkillMatchEnabled()).resolves.toBe(true)
  expect(get).toHaveBeenCalledWith("/v1/agents/me/skills/status")
})

test.each([[{ enabled: false }], [{ enabled: "true" }], [{}], [null]])(
  "status: anything but enabled === true is off (%p)",
  async (payload) => {
    get.mockResolvedValueOnce({ data: { status: true, data: payload } })
    await expect(getSkillMatchEnabled()).resolves.toBe(false)
  },
)

test("match: sends only the O*NET code — never a user id — and unwraps the envelope", async () => {
  const out = { reason: null, have: [], toBuild: [] }
  get.mockResolvedValueOnce({ data: { status: true, data: out } })
  await expect(getSkillMatch("15-1252.00")).resolves.toEqual(out)
  expect(get).toHaveBeenCalledWith("/v1/agents/me/skill-match", { params: { onet: "15-1252.00" } })
  const params = (get.mock.calls[0][1] as { params: Record<string, unknown> }).params
  expect(Object.keys(params)).toEqual(["onet"])
})
