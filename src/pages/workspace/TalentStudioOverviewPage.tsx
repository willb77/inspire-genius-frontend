/**
 * Talent Studio Overview (TS-2) for managers and practitioners (ROLE-C):
 * mounted at /manager/talent-studio and /practitioner/talent-studio, with
 * `audience` set by the route to pick the chrome and the role's own links.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import TalentStudioOverviewBody from "@/components/talent-studio/TalentStudioOverviewBody"

export default function WorkspaceTalentStudioOverviewPage({ audience }: { audience: WorkspaceAudience }) {
  return (
    <WorkspaceLayout audience={audience}>
      <TalentStudioOverviewBody role={audience} />
    </WorkspaceLayout>
  )
}
