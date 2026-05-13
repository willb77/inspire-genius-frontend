/**
 * @jest-environment jsdom
 *
 * Tests for cultureService after B.2 rewire (2026-05-13). All flows now
 * route at document-service with doc_kind="corporate_culture".
 */
import {
  listCultureDocs,
  uploadCultureDoc,
  deleteCultureDoc,
} from "../cultureService"
import {
  initiateUpload,
  uploadToS3,
  triggerProcessing,
  listDocumentsV2,
  deleteDocumentV2,
} from "@/services/documents/documentService"

jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: jest.fn(),
  uploadToS3: jest.fn(),
  triggerProcessing: jest.fn(),
  listDocumentsV2: jest.fn(),
  deleteDocumentV2: jest.fn(),
}))

beforeEach(() => jest.clearAllMocks())

describe("cultureService → document-service (corporate_culture)", () => {
  it("listCultureDocs filters by doc_kind=corporate_culture", async () => {
    ;(listDocumentsV2 as jest.Mock).mockResolvedValueOnce({
      documents: [
        {
          id: "c1",
          filename: "values.pdf",
          doc_kind: "corporate_culture",
          content_type: "application/pdf",
          status: "ready",
          created_at: "2026-05-13T00:00:00Z",
          updated_at: "2026-05-13T00:00:00Z",
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
      has_more: false,
    })

    const result = await listCultureDocs()

    expect(listDocumentsV2).toHaveBeenCalledWith({
      doc_kind: "corporate_culture",
      limit: 100,
    })
    expect(result.total).toBe(1)
    expect(result.documents[0].id).toBe("c1")
    expect(result.documents[0].file_type).toBe("corporate_culture")
  })

  it("uploadCultureDoc runs presigned URL → S3 → process with doc_kind tag", async () => {
    ;(initiateUpload as jest.Mock).mockResolvedValueOnce({
      document_id: "c2",
      upload_url: "https://s3.example/u",
      upload_fields: { key: "k" },
      s3_key: "org/c2.pdf",
      expires_in: 900,
    })
    ;(uploadToS3 as jest.Mock).mockResolvedValueOnce(undefined)
    ;(triggerProcessing as jest.Mock).mockResolvedValueOnce({
      id: "c2",
      filename: "mission.pdf",
      doc_kind: "corporate_culture",
      content_type: "application/pdf",
      status: "processing",
      created_at: "2026-05-13T00:00:00Z",
      updated_at: "2026-05-13T00:00:00Z",
    })

    const file = new File(["data"], "mission.pdf", { type: "application/pdf" })
    const result = await uploadCultureDoc(file)

    expect(initiateUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "mission.pdf",
        content_type: "application/pdf",
        doc_kind: "corporate_culture",
      }),
    )
    expect(triggerProcessing).toHaveBeenCalledWith("c2")
    expect(result.id).toBe("c2")
    expect(result.file_type).toBe("corporate_culture")
  })

  it("deleteCultureDoc delegates to deleteDocumentV2", async () => {
    ;(deleteDocumentV2 as jest.Mock).mockResolvedValueOnce(undefined)
    await deleteCultureDoc("c3")
    expect(deleteDocumentV2).toHaveBeenCalledWith("c3")
  })
})
