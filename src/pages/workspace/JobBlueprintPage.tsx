/**
 * Job Blueprint — James (AdminAgent) job-blueprint match (Combined Plan §A.E3.4).
 *
 * Shared by managers and practitioners (ROLE-C): mounted at /manager/* and
 * /practitioner/*, with `audience` set by the route to pick the chrome.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import JobBlueprintBody from "@/components/task-agents/JobBlueprintBody"
import { ValidationReviewQueue } from "@/components/job-blueprint/validation/ValidationReviewQueue"
import TalentStudioStageTabs from "@/components/talent-studio/TalentStudioStageTabs"

export default function WorkspaceJobBlueprintPage({ audience }: { audience: WorkspaceAudience }) {
  return (
    <WorkspaceLayout audience={audience}>
      {/* RM-7: the Roles stage tabs (Talent Studio, job_fit_v2 on). */}
      <TalentStudioStageTabs role={audience} />
      {/* N-4: a practitioner reviewer's queue. Managers already have theirs on
          /manager/job-dna, so it is not repeated on /manager/job-blueprint.
          Renders nothing unless blueprint_validation is on for the caller. */}
      {audience === "practitioner" ? <ValidationReviewQueue /> : null}
      <JobBlueprintBody />
    </WorkspaceLayout>
  )
}
