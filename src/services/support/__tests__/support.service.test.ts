/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { createTicket, listTickets, getTicket, updateTicket, addMessage, listMessages } from "../support.service"

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
