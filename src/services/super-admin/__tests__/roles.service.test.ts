/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { getRoles } from "../roles.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("roles.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("getRoles gets /v1/rbac/roles", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { roles: [{ id: "r1", name: "admin" }] } } })
    const result = await getRoles()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/rbac/roles")
    expect(result.data).toEqual({ roles: [{ id: "r1", name: "admin" }] })
  })
})
