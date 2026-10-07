/**
 * /practitioner/character-lab — Character Lab for a practitioner.
 *
 * Thin layout wrapper around the shared body (mirrors InterviewStudioPage).
 * No CSV export or CSV import here: those stay super-admin only — see
 * `CharacterLabBodyProps.fullAccess`.
 */
import PractitionerLayout from "@/layouts/PractitionerLayout"
import { CharacterLabBody } from "@/pages/super-admin/CharacterLab"

export default function PractitionerCharacterLabPage() {
  return (
    <PractitionerLayout>
      <CharacterLabBody fullAccess={false} />
    </PractitionerLayout>
  )
}
