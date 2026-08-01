/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { targetsService } from "../targets.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("targetsService", () => {
  beforeEach(() => jest.clearAllMocks())

  it("extract posts the JD text to /v1/targets/extract as { jdText }", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { behaviors: [] } } })
    await targetsService.extract("Lead a support team")
    expect(mockApi.post).toHaveBeenCalledWith("/v1/targets/extract", {
      jdText: "Lead a support team",
    })
  })

  it("routes through the API-Gateway `api` instance, not the Agent Engine", () => {
    // The neutral target surface lives on blueprint-service behind API Gateway;
    // it must not go through getApi()/agentApi. Asserting the call target keeps
    // that contract from silently regressing.
    mockApi.post.mockResolvedValueOnce({ data: { data: { behaviors: [] } } })
    void targetsService.extract("x")
    expect(mockApi.post).toHaveBeenCalledTimes(1)
  })
})
