import { getStudioInterviewSharingEnabled } from "@/services/switches/studioInterviewSharing.service"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }))
const get = agentApi.get as jest.Mock

describe("getStudioInterviewSharingEnabled (S-3)", () => {
  it("reads the agent-engine switch route", async () => {
    get.mockResolvedValueOnce({ data: { status: true, data: { enabled: true } } })
    await expect(getStudioInterviewSharingEnabled()).resolves.toBe(true)
    expect(get).toHaveBeenCalledWith("/v1/agents/switches/studio-interview-sharing")
  })

  it.each([
    ["off", { data: { enabled: false } }],
    ["a truthy non-boolean", { data: { enabled: 1 } }],
    ["no data", {}],
  ])("is false for %s", async (_l, body) => {
    get.mockResolvedValueOnce({ data: body })
    await expect(getStudioInterviewSharingEnabled()).resolves.toBe(false)
  })
})
