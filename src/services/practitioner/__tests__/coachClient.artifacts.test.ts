/**
 * Client artefacts — the upload that used to lie, and the matrix that used to
 * assert absence it had never checked.
 *
 * `uploadClientResource` was `Promise.resolve({ ok: true })`: it discarded the
 * file and reported success. The tests that matter here are the ones that fail
 * if it ever goes back to succeeding unconditionally.
 */
const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock("@/lib/agentApi", () => ({ agentApi: { get: mockGet, post: mockPost } }))

const mockInitiate = jest.fn()
const mockUploadS3 = jest.fn()
const mockProcess = jest.fn()
jest.mock("@/services/documents/documentService", () => ({
  initiateUpload: (...a: unknown[]) => mockInitiate(...a),
  uploadToS3: (...a: unknown[]) => mockUploadS3(...a),
  triggerProcessing: (...a: unknown[]) => mockProcess(...a),
}))

type Svc = typeof import("../coachClient.service")
const env = (data: unknown) => ({ data: { status: true, data } })
const file = () => new File(["x"], "cv.pdf", { type: "application/pdf" })

describe("coachClient artefacts (backend mode)", () => {
  let svc: Svc

  beforeAll(async () => {
    process.env.VITE_COACH_BACKEND = "true"
    jest.resetModules()
    svc = await import("../coachClient.service")
  })
  afterAll(() => { delete process.env.VITE_COACH_BACKEND })
  beforeEach(() => jest.clearAllMocks())

  describe("uploadClientResource", () => {
    it("actually uploads: presign → S3 → process", async () => {
      mockGet.mockResolvedValueOnce(env({ client_id: "c1", linked_user_sub: "sub-9" }))
      mockInitiate.mockResolvedValueOnce({
        upload_url: "https://s3", upload_fields: { k: "v" }, document_id: "d1",
      })
      await svc.uploadClientResource("c1", "resume", file())

      expect(mockInitiate).toHaveBeenCalledTimes(1)
      expect(mockUploadS3).toHaveBeenCalledTimes(1)
      expect(mockProcess).toHaveBeenCalledWith("d1")
    })

    it("attributes the row to the CLIENT via subject_user_id", async () => {
      // This is the whole mechanism: subject = client, uploader stays the coach.
      mockGet.mockResolvedValueOnce(env({ client_id: "c1", linked_user_sub: "sub-9" }))
      mockInitiate.mockResolvedValueOnce({ upload_url: "u", upload_fields: {}, document_id: "d" })
      await svc.uploadClientResource("c1", "resume", file())
      expect(mockInitiate.mock.calls[0][0]).toMatchObject({
        doc_kind: "resume", subject_user_id: "sub-9",
      })
    })

    it("falls back to client_id when the client has not accepted an invitation", async () => {
      mockGet.mockResolvedValueOnce(env({ client_id: "c1", linked_user_sub: null }))
      mockInitiate.mockResolvedValueOnce({ upload_url: "u", upload_fields: {}, document_id: "d" })
      await svc.uploadClientResource("c1", "resume", file())
      expect(mockInitiate.mock.calls[0][0].subject_user_id).toBe("c1")
    })

    it("REJECTS a resource it cannot store instead of reporting success", async () => {
      // The regression guard. An assessment is not a document upload; the old
      // code returned { ok: true } for it and dropped the file.
      await expect(svc.uploadClientResource("c1", "disc", file())).rejects.toThrow(/not a document upload/i)
      expect(mockInitiate).not.toHaveBeenCalled()
    })

    it("REJECTS with no file rather than succeeding emptily", async () => {
      await expect(svc.uploadClientResource("c1", "resume", undefined)).rejects.toThrow(/choose a file/i)
      expect(mockInitiate).not.toHaveBeenCalled()
    })
  })

  describe("getClient folds artefacts in", () => {
    it("marks a resource present when the backend says so", async () => {
      mockGet
        .mockResolvedValueOnce(env({ client_id: "c1" }))
        .mockResolvedValueOnce(env({
          clientId: "c1",
          checked: { resume: true, bio: false, additional_info: false },
          unchecked: ["disc", "goals"],
          items: [{ resource: "resume", documentId: "d1", filename: "cv.pdf" }],
        }))
      const d = await svc.getClient("c1")
      expect(d?.resources.resume).toBe(true)
      expect(d?.resourcesUnchecked).toEqual(["disc", "goals"])
      expect(d?.resourcesPresent).toBe(1)
    })

    it("when the artefact call FAILS, everything stays UNCHECKED — never false", async () => {
      // The honesty guard. A failed lookup must not render as "nothing on file".
      mockGet
        .mockResolvedValueOnce(env({ client_id: "c1" }))
        .mockRejectedValueOnce(new Error("500"))
      const d = await svc.getClient("c1")
      expect(d).not.toBeNull()
      expect(d?.resourcesUnchecked).toEqual(
        expect.arrayContaining(["resume", "bio", "additional_info", "disc", "goals"]),
      )
    })
  })
})
