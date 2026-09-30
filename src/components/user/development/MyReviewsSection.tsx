/**
 * Reviews — what a coach wrote back about the goals the person shared.
 *
 * Reads through **`useMyGoalReviews`**, the hook that already owns
 * `GET /v1/growth/me/goal-reviews` for the Goals Studio. Deliberately not a
 * second reader: two hooks on one route means two caches that can disagree
 * about what a coach said, and the person would see whichever one their route
 * happened to warm.
 *
 * `reviewerSub` is never rendered. It is an identity id, it means nothing to
 * the reader, and the type already says the display name is
 * `reviewerName ?? "Your coach"` — so an unnamed reviewer reads as a role
 * rather than as a uuid.
 */
import { MessagesSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import apiErrorMessage from "@/lib/apiErrorMessage"
import { useMyGoalReviews } from "@/hooks/summit/useMyGoals"
import type { GoalReview } from "@/types/development"
import SelfSection from "./SelfSection"

function ReviewRow({ review }: { review: GoalReview }) {
  return (
    <li className="space-y-1 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{review.reviewerName || "Your coach"}</p>
        <Badge variant={review.ratified ? "secondary" : "outline"}>
          {review.ratified ? "Agreed with this goal" : "Wants to talk it through"}
        </Badge>
      </div>
      {review.comment ? (
        <p className="text-sm text-muted-foreground">{review.comment}</p>
      ) : (
        // A review row with no comment is a real state — the coach ratified
        // without writing anything — and saying so beats an empty paragraph.
        <p className="text-sm italic text-muted-foreground">No comment left.</p>
      )}
    </li>
  )
}

export default function MyReviewsSection() {
  const reviews = useMyGoalReviews()
  const rows = reviews.data?.reviews ?? []

  return (
    <SelfSection
      id="my-reviews"
      title="Coach reviews"
      icon={MessagesSquare}
      lead="What a coach wrote back about the goals you shared with them."
      isLoading={reviews.isLoading}
      isError={reviews.isError}
      errorMessage={
        reviews.isError
          ? apiErrorMessage(reviews.error, "Please try again in a moment.")
          : undefined
      }
      onRetry={() => void reviews.refetch()}
      isEmpty={!reviews.isError && rows.length === 0}
      emptyHeadline="No coach has reviewed your goals yet."
      emptyBody="A review appears here once you have shared a goal from Goals Studio and a coach has read it. Nothing you have not shared is visible to them, and nothing here is written by you."
    >
      <ul className="space-y-2">
        {rows.map((review) => (
          <ReviewRow key={review.id} review={review} />
        ))}
      </ul>
    </SelfSection>
  )
}
