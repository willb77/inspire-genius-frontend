/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { bulkImportUsers, getBulkImportStatus, sendBulkInvitations, getInvitationStatus, resendInvitation } from "../bulk-import"

jest.mock("@/lib/axios", () => ({
  api: { post: jest.fn(), get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("bulk-import", () => {
  beforeEach(() => jest.clearAllMocks())

  it("bulkImportUsers posts records", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { batch_id: "b1" } })
    await bulkImportUsers([{ email: "a@b.com" } as never])
    expect(mockApi.post).toHaveBeenCalledWith("/api/v1/users/bulk-import", { users: [{ email: "a@b.com" }] })
  })

  it("getBulkImportStatus gets by batch id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { status: "complete" } })
    await getBulkImportStatus("b1")
    expect(mockApi.get).toHaveBeenCalledWith("/api/v1/users/bulk-import/b1")
  })

  it("sendBulkInvitations posts payload", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { sent: 5 } })
    await sendBulkInvitations({ user_ids: ["u1"] } as never)
    expect(mockApi.post).toHaveBeenCalledWith("/api/v1/invitations/send-bulk", expect.any(Object))
  })

  it("getInvitationStatus gets by batch id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { status: "sent" } })
    await getInvitationStatus("b1")
    expect(mockApi.get).toHaveBeenCalledWith("/api/v1/invitations/status/b1")
  })

  it("resendInvitation posts by invite id", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true } })
    await resendInvitation("inv1")
    expect(mockApi.post).toHaveBeenCalledWith("/api/v1/invitations/resend/inv1")
  })
})
