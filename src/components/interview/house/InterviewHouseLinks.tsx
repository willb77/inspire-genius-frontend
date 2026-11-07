import { Link } from "react-router-dom"
import type { WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import { interviewLinksFor, type InterviewPage } from "./interviewHouseRoutes"

/**
 * House style (interview area): a row of plain links across the interviewer
 * pages. Interview Prep had no link anywhere and the manager's list was
 * reachable from one dashboard version only. Display only — every target is an
 * existing route behind the same guard.
 */
export default function InterviewHouseLinks({
  audience,
  current,
}: {
  audience: WorkspaceAudience
  current: InterviewPage
}) {
  return (
    <nav aria-label="Interview pages" className="mx-auto flex max-w-3xl flex-wrap gap-4 pt-6 text-sm">
      {interviewLinksFor(audience, current).map((l) => (
        <Link key={l.to} to={l.to} className="text-primary underline-offset-4 hover:underline">
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
