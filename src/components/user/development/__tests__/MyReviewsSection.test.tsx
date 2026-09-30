/**
 * Coach reviews, self-scoped.
 *
 * Two things pinned:
 *  - it reads through `useMyGoalReviews`, the hook that ALREADY owns
 *    `GET /v1/growth/me/goal-reviews`. A second reader means two caches that
 *    can disagree about what a coach said.
 *  - `reviewerSub` is never rendered. It is an identity id that means nothing
 *    to the reader.
 */
import { render, screen } from "@testing-library/react"
import type { GoalReview } from "@/types/development"

const useMyGoalReviews = jest.fn()
jest.mock("@/hooks/summit/useMyGoals", () => ({
  useMyGoalReviews: () => useMyGoalReviews(),
}))

import MyReviewsSection from "../MyReviewsSection"

const review = (over: Partial<GoalReview> = {}): GoalReview => ({
  id: "r1",
  goalId: "g1",
  memberId: "m1",
  // Deliberately not a uuid-shaped string: this repo is public, and the
  // sanitize audit reports uuids and 12-digit runs (they look like AWS
  // account ids). A fixture that trips the audit on every future sweep is
  // noise a human then has to clear by hand.
  reviewerSub: "reviewer-sub-should-never-render",
  reviewerName: "Dana Okoro",
  ratified: true,
  comment: "Good goal — let's tighten the timeline.",
  ...over,
})

function query(over: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  useMyGoalReviews.mockReturnValue(query({ data: { memberId: "m1", reviews: [] } }))
})

it("says a review needs a shared goal first", () => {
  render(<MyReviewsSection />)
  expect(screen.getByText("No coach has reviewed your goals yet.")).toBeInTheDocument()
  expect(screen.getByText(/shared a goal from Goals Studio/i)).toBeInTheDocument()
})

it("distinguishes a failed read from having no reviews", () => {
  useMyGoalReviews.mockReturnValue(query({ isError: true, error: new Error("boom") }))
  render(<MyReviewsSection />)
  expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load this section/i)
  expect(screen.queryByText("No coach has reviewed your goals yet.")).not.toBeInTheDocument()
})

it("shows the reviewer's name and what they concluded", () => {
  useMyGoalReviews.mockReturnValue(query({ data: { memberId: "m1", reviews: [review()] } }))
  render(<MyReviewsSection />)
  expect(screen.getByText("Dana Okoro")).toBeInTheDocument()
  expect(screen.getByText("Agreed with this goal")).toBeInTheDocument()
  expect(screen.getByText(/tighten the timeline/)).toBeInTheDocument()
})

it("falls back to the role when the roster knows no name, never to an id", () => {
  useMyGoalReviews.mockReturnValue(
    query({ data: { memberId: "m1", reviews: [review({ reviewerName: null })] } }),
  )
  const { container } = render(<MyReviewsSection />)
  expect(screen.getByText("Your coach")).toBeInTheDocument()
  expect(container.textContent).not.toContain("should-never-render")
})

it("says a review carried no comment rather than leaving a blank", () => {
  useMyGoalReviews.mockReturnValue(
    query({
      data: { memberId: "m1", reviews: [review({ ratified: false, comment: "" })] },
    }),
  )
  render(<MyReviewsSection />)
  expect(screen.getByText("No comment left.")).toBeInTheDocument()
  expect(screen.getByText("Wants to talk it through")).toBeInTheDocument()
})
