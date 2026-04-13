/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { getFrontendText } from "../frontend-text.service"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("frontend-text.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("getFrontendText gets /v1/frontend-text", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { items: [{ key: "k", value: "v" }] } } })
    const result = await getFrontendText()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/frontend-text")
    expect(result.data?.items).toEqual([{ key: "k", value: "v" }])
  })
})
