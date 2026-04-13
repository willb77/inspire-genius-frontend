/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import {
  initiateUpload,
  triggerProcessing,
  listDocumentsV2,
  getDocument,
  getDownloadUrl,
  deleteDocumentV2,
  searchDocuments,
} from "../documentService"

jest.mock("@/lib/axios", () => ({
  api: { post: jest.fn(), get: jest.fn(), delete: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("documentService", () => {
  beforeEach(() => jest.clearAllMocks())

  it("initiateUpload posts to /v1/documents/upload", async () => {
    const presigned = { document_id: "d1", upload_url: "https://s3.example.com", upload_fields: {}, s3_key: "k", expires_in: 3600 }
    mockApi.post.mockResolvedValueOnce({ data: { data: presigned } })
    const result = await initiateUpload({ filename: "f.pdf", content_type: "application/pdf", file_size: 100 })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/documents/upload", expect.any(Object))
    expect(result).toEqual(presigned)
  })

  it("triggerProcessing posts to process endpoint", async () => {
    const doc = { id: "d1", filename: "f.pdf" }
    mockApi.post.mockResolvedValueOnce({ data: { data: doc } })
    const result = await triggerProcessing("d1")
    expect(mockApi.post).toHaveBeenCalledWith("/v1/documents/d1/process")
    expect(result).toEqual(doc)
  })

  it("listDocumentsV2 gets documents with params", async () => {
    const list = { documents: [], total: 0, limit: 10, offset: 0, has_more: false }
    mockApi.get.mockResolvedValueOnce({ data: { data: list } })
    const result = await listDocumentsV2({ limit: 10, offset: 0 })
    expect(mockApi.get).toHaveBeenCalledWith("/v1/documents/", { params: { limit: 10, offset: 0 } })
    expect(result).toEqual(list)
  })

  it("getDocument gets single document by id", async () => {
    const doc = { id: "d1", filename: "f.pdf" }
    mockApi.get.mockResolvedValueOnce({ data: { data: doc } })
    const result = await getDocument("d1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/documents/d1")
    expect(result).toEqual(doc)
  })

  it("getDownloadUrl returns URL string", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { url: "https://s3.example.com/file" } } })
    const result = await getDownloadUrl("d1")
    expect(result).toBe("https://s3.example.com/file")
  })

  it("deleteDocumentV2 deletes by id", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteDocumentV2("d1")
    expect(mockApi.delete).toHaveBeenCalledWith("/v1/documents/d1")
  })

  it("searchDocuments posts search request", async () => {
    const resp = { hits: [], total: 0, query: "test" }
    mockApi.post.mockResolvedValueOnce({ data: { data: resp } })
    const result = await searchDocuments({ query: "test" })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/documents/search", { query: "test" })
    expect(result).toEqual(resp)
  })
})
