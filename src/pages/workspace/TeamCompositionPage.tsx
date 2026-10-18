/**
 * Team Composition — Atlas (DashboardAgent) team composition (Combined Plan §A.E3.4).
 *
 * Shared by managers and practitioners (ROLE-C): mounted at /manager/* and
 * /practitioner/*, with `audience` set by the route to pick the chrome.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import TeamCompositionBody from "@/components/task-agents/TeamCompositionBody"

export default function WorkspaceTeamCompositionPage({ audience }: { audience: WorkspaceAudience }) {
  return (
    <WorkspaceLayout audience={audience}>
      <TeamCompositionBody />
    </WorkspaceLayout>
  )
}
