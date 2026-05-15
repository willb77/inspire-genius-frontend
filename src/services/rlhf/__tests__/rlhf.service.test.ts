/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { getRlhfModels, getRlhfModel, approveRlhfModel } from "../rlhf.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("rlhf.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("getRlhfModels gets with limit param", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { models: [], total: 0 } } })
    await getRlhfModels(25)
    expect(mockApi.get).toHaveBeenCalledWith("/v1/rlhf/models", { params: { limit: 25 } })
  })

  it("getRlhfModels defaults limit to 50", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { models: [] } } })
    await getRlhfModels()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/rlhf/models", { params: { limit: 50 } })
  })

  it("getRlhfModel gets by id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { model_id: "m1" } } })
    await getRlhfModel("m1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/rlhf/models/m1")
  })

  it("approveRlhfModel posts approval", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { model_id: "m1", status: "approved" } } })
    await approveRlhfModel("m1", { approved_by: "admin" } as never)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/rlhf/models/m1/approve", { approved_by: "admin" })
  })
})
