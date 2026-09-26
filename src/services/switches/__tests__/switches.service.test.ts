import { getPractitionerProgrammeEnabled } from "@/services/switches/switches.service"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }))
const get = agentApi.get as jest.Mock

describe("getPractitionerProgrammeEnabled (D9)", () => {
  it("reads the agent-engine switch route", async () => {
    get.mockResolvedValueOnce({ data: { status: true, data: { enabled: true } } })
    await expect(getPractitionerProgrammeEnabled()).resolves.toBe(true)
    expect(get).toHaveBeenCalledWith("/v1/agents/switches/practitioner-programme")
  })

  it.each([
    ["off", { status: true, data: { enabled: false } }],
    ["a truthy non-boolean", { status: true, data: { enabled: "true" } }],
    ["no data", {}],
  ])("is false for %s", async (_l, body) => {
    get.mockResolvedValueOnce({ data: body })
    await expect(getPractitionerProgrammeEnabled()).resolves.toBe(false)
  })
})
