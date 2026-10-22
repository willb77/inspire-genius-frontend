import { getFitSharedDisplayEnabled } from "@/services/switches/fitSharedDisplay.service"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }))
const get = agentApi.get as jest.Mock

describe("getFitSharedDisplayEnabled (FIT-5b)", () => {
  it("reads the agent-engine switch route through agentApi", async () => {
    get.mockResolvedValueOnce({ data: { status: true, data: { enabled: true } } })
    await expect(getFitSharedDisplayEnabled()).resolves.toBe(true)
    expect(get).toHaveBeenCalledWith("/v1/agents/switches/fit-shared-display")
  })

  it.each([
    ["off", { data: { enabled: false } }],
    ["a truthy non-boolean", { data: { enabled: "true" } }],
    ["no data", {}],
  ])("is false for %s", async (_l, body) => {
    get.mockResolvedValueOnce({ data: body })
    await expect(getFitSharedDisplayEnabled()).resolves.toBe(false)
  })

  it("lets an error through, for the hook to read as off", async () => {
    get.mockRejectedValueOnce(new Error("HTTP 401"))
    await expect(getFitSharedDisplayEnabled()).rejects.toThrow("HTTP 401")
  })
})
