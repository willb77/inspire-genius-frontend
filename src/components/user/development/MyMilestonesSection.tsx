/**
 * Milestones — the person's own roadmap, grouped by horizon.
 *
 * **Read-only, and that is a fact about the backend rather than a product
 * choice.** `GET /v1/growth/me/milestones` exists; there is no self-scoped
 * POST or PATCH on the tip, so a milestone is written by a coach in the Team
 * Development Studio. Offering an edit control here would be a button that
 * cannot save, which is the failure mode this lane has hit before (a
 * `toast.success` with no mutation behind it). The empty state says who can
 * put one here instead.
 *
 * Grouping uses `MILESTONE_HORIZON_ORDER` rather than the array order the
 * server happens to return, and a horizon with nothing in it is not rendered —
 * five empty lanes read as five things going wrong.
 */
import { Flag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  MILESTONE_HORIZON_LABEL,
  MILESTONE_HORIZON_ORDER,
  MILESTONE_STATUS_LABEL,
} from "@/constants/development"
import apiErrorMessage from "@/lib/apiErrorMessage"
import { useMyMilestones } from "@/hooks/me/useMyDevelopment"
import type { Milestone } from "@/types/development"
import SelfSection from "./SelfSection"

function MilestoneRow({ milestone }: { milestone: Milestone }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{milestone.title}</p>
        {milestone.status === "blocked" && milestone.blockedReason && (
          // Surfaced rather than reduced to the badge: "Blocked" without the
          // reason tells the person nothing they can do next.
          <p className="mt-0.5 text-xs text-muted-foreground">
            Blocked: {milestone.blockedReason}
          </p>
        )}
        {milestone.dueDate && (
          <p className="mt-0.5 text-xs text-muted-foreground">Due {milestone.dueDate}</p>
        )}
      </div>
      <Badge variant={milestone.status === "done" ? "secondary" : "outline"}>
        {MILESTONE_STATUS_LABEL[milestone.status]}
      </Badge>
    </li>
  )
}

export default function MyMilestonesSection() {
  const milestones = useMyMilestones()
  const rows = milestones.data ?? []

  return (
    <SelfSection
      id="my-milestones"
      title="Milestones"
      icon={Flag}
      lead="Your roadmap — the checkpoints on the way to your goals, in the order they come."
      isLoading={milestones.isLoading}
      isError={milestones.isError}
      errorMessage={
        milestones.isError
          ? apiErrorMessage(milestones.error, "Please try again in a moment.")
          : undefined
      }
      onRetry={() => void milestones.refetch()}
      isEmpty={!milestones.isError && rows.length === 0}
      emptyHeadline="No milestones on your roadmap yet."
      emptyBody="Milestones are set with your coach, against one of your goals, in the Team Development Studio — there is no way to add one from this page. Ask for one in your next growth conversation and it will appear here."
    >
      <div className="space-y-4">
        {MILESTONE_HORIZON_ORDER.map((horizon) => {
          const inLane = rows
            .filter((m) => m.horizon === horizon)
            .sort((a, b) => a.sequence - b.sequence)
          if (inLane.length === 0) return null
          return (
            <div key={horizon} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {MILESTONE_HORIZON_LABEL[horizon]}
              </p>
              <ul className="space-y-2">
                {inLane.map((m) => (
                  <MilestoneRow key={m.milestoneId} milestone={m} />
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </SelfSection>
  )
}
