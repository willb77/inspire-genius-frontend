/**
 * Team fit (TS-4a) for managers and practitioners (ROLE-C): mounted at
 * /manager/team-fit and /practitioner/team-fit, with `audience` set by the
 * route to pick the chrome and the member links' prefix.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import TeamFitBody from "@/components/talent-studio/TeamFitBody"

export default function WorkspaceTeamFitPage({ audience }: { audience: WorkspaceAudience }) {
  return (
    <WorkspaceLayout audience={audience}>
      <TeamFitBody audience={audience} />
    </WorkspaceLayout>
  )
}
