/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import {
  createTicket, listTickets, getTicket, updateTicket, addMessage, listMessages,
  listAdminTickets, getAdminTicket, listAdmins, claimTicket, escalateTicket, addAdminNote, resolveTicket,
} from "../support.service"

jest.mock("@/lib/axios", () => ({
  api: { post: jest.fn(), get: jest.fn(), patch: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("support.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("createTicket posts to /v1/support/tickets", async () => {
    const ticket = { id: "t1", subject: "Help" }
    mockApi.post.mockResolvedValueOnce({ data: { data: ticket } })
    const result = await createTicket({ user_id: "u1", subject: "Help", description: "Issue" })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/support/tickets", expect.any(Object))
    expect(result).toEqual(ticket)
  })

  it("listTickets gets with params", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await listTickets({ status: "open" })
    expect(mockApi.get).toHaveBeenCalledWith("/v1/support/tickets", { params: { status: "open" } })
  })

  it("getTicket gets by id", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { id: "t1" } } })
    await getTicket("t1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/support/tickets/t1")
  })

  it("updateTicket patches by id", async () => {
    mockApi.patch.mockResolvedValueOnce({ data: { data: { id: "t1", status: "closed" } } })
    await updateTicket("t1", { status: "closed" })
    expect(mockApi.patch).toHaveBeenCalledWith("/v1/support/tickets/t1", { status: "closed" })
  })

  it("addMessage posts to ticket messages", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { id: "msg1" } } })
    await addMessage("t1", { author_id: "u1", content: "Thanks" })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/support/tickets/t1/messages", expect.any(Object))
  })

  it("listMessages gets messages for ticket", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await listMessages("t1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/support/tickets/t1/messages")
  })
})

describe("support.service — Help and Support Management", () => {
  beforeEach(() => jest.clearAllMocks())

  it("listAdminTickets gets /v1/support/admin/tickets with the filter", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: [] } })
    await listAdminTickets({ status: "open" })
    expect(mockApi.get).toHaveBeenCalledWith("/v1/support/admin/tickets", { params: { status: "open" } })
  })

  it("getAdminTicket and listAdmins hit the admin prefix", async () => {
    mockApi.get.mockResolvedValue({ data: { data: [] } })
    await getAdminTicket("t 1")
    expect(mockApi.get).toHaveBeenCalledWith("/v1/support/admin/tickets/t%201")
    await listAdmins()
    expect(mockApi.get).toHaveBeenCalledWith("/v1/support/admin/admins")
  })

  it("claimTicket posts with no body", async () => {
    mockApi.post.mockResolvedValueOnce({ data: { data: { claimed: true, ticket: { id: "t1" } } } })
    const result = await claimTicket("t1")
    expect(mockApi.post).toHaveBeenCalledWith("/v1/support/admin/tickets/t1/claim")
    expect(result.claimed).toBe(true)
  })

  it("escalateTicket, addAdminNote and resolveTicket post their bodies", async () => {
    mockApi.post.mockResolvedValue({ data: { data: { id: "t1" } } })
    await escalateTicket("t1", { to_email: "a@b.c", note: "why" })
    expect(mockApi.post).toHaveBeenCalledWith("/v1/support/admin/tickets/t1/escalate", { to_email: "a@b.c", note: "why" })
    await addAdminNote("t1", "note")
    expect(mockApi.post).toHaveBeenCalledWith("/v1/support/admin/tickets/t1/notes", { content: "note" })
    await resolveTicket("t1", "done")
    expect(mockApi.post).toHaveBeenCalledWith("/v1/support/admin/tickets/t1/resolve", { content: "done" })
    await resolveTicket("t1")
    expect(mockApi.post).toHaveBeenLastCalledWith("/v1/support/admin/tickets/t1/resolve", undefined)
  })
})
