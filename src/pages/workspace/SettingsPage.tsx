/**
 * Settings — the shared Settings component; its cards gate themselves by role.
 *
 * Shared by managers and practitioners (ROLE-C): mounted at /manager/* and
 * /practitioner/*, with `audience` set by the route to pick the chrome.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import Settings from "@/components/shared/settings/Settings"

export default function WorkspaceSettingsPage({ audience }: { audience: WorkspaceAudience }) {
  return (
    <WorkspaceLayout audience={audience}>
      <Settings />
    </WorkspaceLayout>
  )
}
