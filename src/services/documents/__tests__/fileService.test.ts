/**
 * @jest-environment jsdom
 *
 * Tests for the legacy `fileService` surface after the B.2 rewire
 * (2026-05-13). All methods now delegate to document-service.
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

// uploadToS3 hits raw XHR — stub it for tests. (XMLHttpRequest is provided
// by jsdom, but we don't want real network calls.)
beforeEach(() => {
  jest.clearAllMocks()
  ;(globalThis as { XMLHttpRequest?: typeof XMLHttpRequest }).XMLHttpRequest =
    class {
      upload = { addEventListener: jest.fn() }
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      readonly status = 204
      open() {}
      send() {
        // Defer to next tick so the test can attach handlers.
        setTimeout(() => this.onload?.(), 0)
      }
    } as unknown as typeof XMLHttpRequest
})

const mockApi = api as jest.Mocked<typeof api>

describe("fileService → document-service delegation", () => {
  it("listDocuments calls /v1/documents/ and groups results by day", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: {
        status: "success",
        data: {
          documents: [
            {
              id: "d1",
              filename: "first.pdf",
              created_at: "2026-05-13T10:00:00Z",
              doc_kind: "pdf",
              content_type: "application/pdf",
            },
            {
              id: "d2",
              filename: "second.pdf",
              created_at: "2026-05-12T08:00:00Z",
              doc_kind: "pdf",
              content_type: "application/pdf",
            },
          ],
          total: 2,
          limit: 10,
          offset: 0,
          has_more: false,
        },
      },
    })

    const result = await listDocuments(1, 10)

    expect(mockApi.get).toHaveBeenCalledWith(
      "/v1/documents/",
      expect.objectContaining({ params: expect.objectContaining({ limit: 10, offset: 0 }) }),
    )
    expect(result.date_groups).toHaveLength(2)
    expect(result.date_groups[0].date).toBe("2026-05-13")
    expect(result.date_groups[0].files[0].id).toBe("d1")
    expect(result.total_count).toBe(2)
  })

  it("listDocuments forwards search filter", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { documents: [], total: 0, limit: 10, offset: 0, has_more: false } },
    })
    await listDocuments(1, 10, { search: "needle" })
    expect(mockApi.get).toHaveBeenCalledWith(
      "/v1/documents/",
      expect.objectContaining({ params: expect.objectContaining({ search: "needle" }) }),
    )
  })

  it("getDocumentDownloadLink hits document-service download route", async () => {
    mockApi.get.mockResolvedValueOnce({
      data: { data: { url: "https://s3.example/presigned" } },
    })
    const url = await getDocumentDownloadLink("f1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/documents/f1/download")
    expect(url).toBe("https://s3.example/presigned")
  })

  it("deleteDocument hits document-service delete route", async () => {
    mockApi.delete.mockResolvedValueOnce({ data: {} })
    await deleteDocument("f1")
    expect(mockApi.delete).toHaveBeenCalledWith("/v1/documents/f1")
  })

  it("bulkDeleteDocuments delegates to per-id deletes", async () => {
    mockApi.delete.mockResolvedValue({ data: {} })
    await bulkDeleteDocuments(["f1", "f2"])
    expect(mockApi.delete).toHaveBeenCalledTimes(2)
    expect(mockApi.delete).toHaveBeenCalledWith("/v1/documents/f1")
    expect(mockApi.delete).toHaveBeenCalledWith("/v1/documents/f2")
  })

  it("bulkDeleteDocuments skips empty array", async () => {
    await bulkDeleteDocuments([])
    expect(mockApi.delete).not.toHaveBeenCalled()
  })

  it("uploadDocuments runs presigned-URL → S3 → process for each file", async () => {
    // 1: presigned URL response
    mockApi.post.mockResolvedValueOnce({
      data: {
        data: {
          document_id: "doc-1",
          upload_url: "https://s3.example/upload",
          upload_fields: { key: "k" },
          s3_key: "user/doc-1.pdf",
          expires_in: 900,
        },
      },
    })
    // 2: triggerProcessing response
    mockApi.post.mockResolvedValueOnce({
      data: {
        data: {
          id: "doc-1",
          filename: "test.pdf",
          doc_kind: "pdf",
          content_type: "application/pdf",
          file_size: 7,
          status: "processing",
        },
      },
    })

    const file = new File(["content"], "test.pdf", { type: "application/pdf" })
    const result = await uploadDocuments([file])

    expect(mockApi.post).toHaveBeenNthCalledWith(
      1,
      "/v1/documents/upload",
      expect.objectContaining({
        filename: "test.pdf",
        content_type: "application/pdf",
      }),
    )
    expect(mockApi.post).toHaveBeenNthCalledWith(2, "/v1/documents/doc-1/process")

    expect(result.uploaded_files).toHaveLength(1)
    expect(result.uploaded_files[0]).toEqual({
      file_id: "doc-1",
      filename: "test.pdf",
      file_type: "pdf",
      file_key: "user/doc-1.pdf",
    })
  })

  it("uploadDocuments returns empty array for empty input", async () => {
    const result = await uploadDocuments([])
    expect(result.uploaded_files).toEqual([])
    expect(mockApi.post).not.toHaveBeenCalled()
  })
})
