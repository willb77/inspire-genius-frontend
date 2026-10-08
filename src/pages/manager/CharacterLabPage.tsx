/**
 * /manager/character-lab — Character Lab for a manager.
 *
 * Thin layout wrapper around the shared body (mirrors InterviewStudioPage).
 * No CSV export or CSV import here: those stay super-admin only — see
 * `CharacterLabBodyProps.fullAccess`.
 */
import ManagerLayout from "@/layouts/ManagerLayout"
import { CharacterLabBody } from "@/pages/super-admin/CharacterLab"

export default function ManagerCharacterLabPage() {
  return (
    <ManagerLayout>
      <CharacterLabBody fullAccess={false} />
    </ManagerLayout>
  )
}
