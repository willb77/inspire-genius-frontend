/**
 * Character Lab. No CSV export or CSV import here: those stay super-admin
 * only — see `CharacterLabBodyProps.fullAccess`.
 *
 * Shared by managers and practitioners (ROLE-C): mounted at /manager/* and
 * /practitioner/*, with `audience` set by the route to pick the chrome.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import { CharacterLabBody } from "@/pages/super-admin/CharacterLab"

export default function WorkspaceCharacterLabPage({ audience }: { audience: WorkspaceAudience }) {
  return (
    <WorkspaceLayout audience={audience}>
      <CharacterLabBody fullAccess={false} />
    </WorkspaceLayout>
  )
}
