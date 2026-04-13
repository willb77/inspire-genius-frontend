/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import {
  listDocuments,
  getDocumentDownloadLink,
  deleteDocument,
  bulkDeleteDocuments,
  uploadDocuments,
} from "../fileService"

jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("fileService", () => {
  beforeEach(() => jest.clearAllMocks())

  it("listDocuments calls /v1/file_service/list with params", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { date_groups: [], total_pages: 1 } } })
    await listDocuments(1, 10)
    expect(mockApi.get).toHaveBeenCalledWith("/v1/file_service/list", expect.objectContaining({
      params: expect.objectContaining({ page: 1, limit: 10 }),
    }))
  })

  it("listDocuments passes filters", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { date_groups: [] } } })
    await listDocuments(1, 10, { search: "test" })
    expect(mockApi.get).toHaveBeenCalledWith("/v1/file_service/list", expect.objectContaining({
      params: expect.objectContaining({ search: "test" }),
    }))
  })

  it("getDocumentDownloadLink returns URL from envelope", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { url: "https://dl.example.com/f" } } })
    const result = await getDocumentDownloadLink("f1")
    expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining("/v1/file_service/download/f1"), expect.any(Object))
    expect(result).toBe("https://dl.example.com/f")
  })

  it("getDocumentDownloadLink returns raw string", async () => {
    mockApi.get.mockResolvedValueOnce({ data: "https://dl.example.com/raw" })
    const result = await getDocumentDownloadLink("f1")
    expect(result).toBe("https://dl.example.com/raw")
  })

  it("deleteDocument calls delete endpoint", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteDocument("f1")
    expect(mockApi.delete).toHaveBeenCalledWith("/v1/file_service/f1", expect.any(Object))
  })

  it("bulkDeleteDocuments posts file_ids", async () => {
    mockApi.post.mockResolvedValueOnce({ data: {} })
    await bulkDeleteDocuments(["f1", "f2"])
    expect(mockApi.post).toHaveBeenCalledWith(
      "/v1/file_service/bulk-delete",
      { file_ids: ["f1", "f2"] },
      expect.any(Object),
    )
  })

  it("bulkDeleteDocuments skips empty array", async () => {
    await bulkDeleteDocuments([])
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it("uploadDocuments posts FormData", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { uploaded: 1 } } })
    const file = new File(["content"], "test.txt", { type: "text/plain" })
    await uploadDocuments([file])
    expect(mockApi.post).toHaveBeenCalledWith(
      "/v1/file_service/upload",
      expect.any(FormData),
      expect.any(Object),
    )
  })
})
