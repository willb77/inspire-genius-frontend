/**
 * @jest-environment jsdom
 *
 * JF-9 — the credentials reads go to the agent-engine through `agentApi`
 * under `/v1/agents/…` (the only prefix API Gateway routes there).
 */
import { agentApi } from "@/lib/agentApi"
import { getBlueprintPrograms, getOccupationLocal } from "../pathwayCredentials.service"

jest.mock("@/lib/agentApi", () => ({ agentApi: { get: jest.fn() } }))
const mockGet = agentApi.get as jest.Mock

beforeEach(() => mockGet.mockReset())

test("getOccupationLocal GETs the OD-5 route for the kind and unwraps the envelope", async () => {
  mockGet.mockResolvedValue({ data: { status: true, data: { state: "off", data: [] } } })
  const out = await getOccupationLocal("11-1021.00", "licenses")
  expect(mockGet).toHaveBeenCalledWith("/v1/agents/occupations/11-1021.00/local/licenses")
  expect(out).toEqual({ state: "off", data: [] })
})

test("getBlueprintPrograms GETs the curriculum route for the blueprint, id encoded", async () => {
  mockGet.mockResolvedValue({ data: { status: true, data: { programs: [], truncated: false } } })
  const out = await getBlueprintPrograms("a/b")
  expect(mockGet).toHaveBeenCalledWith("/v1/agents/career-discovery/curriculum/blueprints/a%2Fb/programs")
  expect(out).toEqual({ programs: [], truncated: false })
})
