/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"

// Mock the feedback hook
const mockMutateAsync = jest.fn().mockResolvedValue({})
jest.mock("@/hooks/feedback/useFeedback", () => ({
  useSubmitFeedback: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

import FeedbackButtons from "../FeedbackButtons"

describe("FeedbackButtons", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders thumbs up and thumbs down buttons", () => {
    render(
      <FeedbackButtons responseId="r1" conversationId="c1" coachId="coach1" />
    )
    expect(screen.getByLabelText("Thumbs up")).toBeInTheDocument()
    expect(screen.getByLabelText("Thumbs down")).toBeInTheDocument()
  })

  it("calls onFeedback callback on thumbs up click", async () => {
    const onFeedback = jest.fn()
    render(
      <FeedbackButtons responseId="r1" conversationId="c1" coachId="coach1" onFeedback={onFeedback} />
    )
    fireEvent.click(screen.getByLabelText("Thumbs up"))
    await new Promise((r) => setTimeout(r, 0))
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 5, message_id: "r1" })
    )
  })

  it("calls onFeedback callback on thumbs down click", async () => {
    const onFeedback = jest.fn()
    render(
      <FeedbackButtons responseId="r1" conversationId="c1" coachId="coach1" onFeedback={onFeedback} />
    )
    fireEvent.click(screen.getByLabelText("Thumbs down"))
    await new Promise((r) => setTimeout(r, 0))
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ rating: 1, message_id: "r1" })
    )
  })
})
