import { getWorkspaceDirectionSettingEnabled } from "@/services/switches/workspaceDirectionSetting.service"
import { agentApi } from "@/lib/agentApi"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }))
const get = agentApi.get as jest.Mock

describe("getWorkspaceDirectionSettingEnabled (WS-1)", () => {
  it("reads the agent-engine switch route through agentApi", async () => {
    get.mockResolvedValueOnce({ data: { status: true, data: { enabled: true } } })
    await expect(getWorkspaceDirectionSettingEnabled()).resolves.toBe(true)
    expect(get).toHaveBeenCalledWith("/v1/agents/switches/workspace-direction-setting")
  })

  it.each([
    ["off", { data: { enabled: false } }],
    ["a truthy non-boolean", { data: { enabled: "true" } }],
    ["no data", {}],
  ])("is false for %s", async (_l, body) => {
    get.mockResolvedValueOnce({ data: body })
    await expect(getWorkspaceDirectionSettingEnabled()).resolves.toBe(false)
  })

  it("lets an error (a 404 before the route deploys) through, for the hook to read as off", async () => {
    get.mockRejectedValueOnce(new Error("HTTP 404"))
    await expect(getWorkspaceDirectionSettingEnabled()).rejects.toThrow("HTTP 404")
  })
})
