/**
 * @jest-environment jsdom
 */
import { api } from "@/lib/axios"
import { submitFeedback, getFeedbackList, getFeedbackStats } from "../feedback.service"

jest.mock("@/lib/axios", () => ({
  api: { post: jest.fn(), get: jest.fn() },
}))

const mockApi = api as jest.Mocked<typeof api>

describe("feedback.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("submitFeedback posts to /v1/feedback", async () => {
    const payload = { coach_id: "c1", message_id: "m1", conversation_id: "conv1", rating: 5, comment: "great" } as never
    mockApi.post.mockResolvedValueOnce({ data: { data: { feedback_id: "fb1" } } })
    const result = await submitFeedback(payload)
    expect(mockApi.post).toHaveBeenCalledWith("/v1/feedback", payload)
    expect(result.data).toEqual({ feedback_id: "fb1" })
  })

  it("getFeedbackList gets with params", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { items: [], total: 0 } } })
    await getFeedbackList({ coach_id: "c1" })
    expect(mockApi.get).toHaveBeenCalledWith("/v1/feedback", { params: { coach_id: "c1" } })
  })

  it("getFeedbackStats gets admin stats", async () => {
    mockApi.get.mockResolvedValueOnce({ data: { data: { avg_rating: 4.5 } } })
    await getFeedbackStats({ coach_id: "c1" })
    expect(mockApi.get).toHaveBeenCalledWith("/v1/admin/feedback/stats", { params: { coach_id: "c1" } })
  })
})
