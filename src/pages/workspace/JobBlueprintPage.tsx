/**
 * Job Blueprint — James (AdminAgent) job-blueprint match (Combined Plan §A.E3.4).
 *
 * Shared by managers and practitioners (ROLE-C): mounted at /manager/* and
 * /practitioner/*, with `audience` set by the route to pick the chrome.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import JobBlueprintBody from "@/components/task-agents/JobBlueprintBody"

export default function WorkspaceJobBlueprintPage({ audience }: { audience: WorkspaceAudience }) {
  return (
    <WorkspaceLayout audience={audience}>
      <JobBlueprintBody />
    </WorkspaceLayout>
  )
}
