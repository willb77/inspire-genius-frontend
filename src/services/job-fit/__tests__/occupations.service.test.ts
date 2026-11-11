/**
 * JF-6 — OD-4 reads go to the agent-engine (`agentApi`) at /v1/agents/occupations,
 * the only prefix API Gateway routes to the engine, and never through `api`.
 */
const mockAgentGet = jest.fn()
const mockApiGet = jest.fn()
jest.mock("@/lib/agentApi", () => ({ agentApi: { get: (...a: unknown[]) => mockAgentGet(...a) } }))
jest.mock("@/lib/axios", () => ({ api: { get: (...a: unknown[]) => mockApiGet(...a) } }))

import { getOccupation, getOccupationPay } from "../occupations.service"

beforeEach(() => {
  jest.clearAllMocks()
  mockAgentGet.mockResolvedValue({ data: { status: true, data: { state: "empty", reason: "r", data: null } } })
})

test("occupation read", async () => {
  await expect(getOccupation("11-1021.00")).resolves.toEqual({ state: "empty", reason: "r", data: null })
  expect(mockAgentGet).toHaveBeenCalledWith("/v1/agents/occupations/11-1021.00")
  expect(mockApiGet).not.toHaveBeenCalled()
})

test("pay read sends no location unless given one", async () => {
  await getOccupationPay("11-1021")
  expect(mockAgentGet).toHaveBeenCalledWith("/v1/agents/occupations/11-1021/pay", { params: {} })
  await getOccupationPay("11-1021", { area: "27701", state: "NC" })
  expect(mockAgentGet).toHaveBeenLastCalledWith("/v1/agents/occupations/11-1021/pay", {
    params: { area: "27701", state: "NC" },
  })
  expect(mockApiGet).not.toHaveBeenCalled()
})
