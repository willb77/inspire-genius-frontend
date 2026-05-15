/**
 * /practitioner/team-composition — Atlas (DashboardAgent) team composition.
 *
 * Wave 4 Lane 4.D (P7.2) — mirrors /manager/team-composition with the
 * practitioner layout. Form body lives in components/task-agents/TeamCompositionBody.tsx.
 */
import PractitionerLayout from "@/layouts/PractitionerLayout"
import TeamCompositionBody from "@/components/task-agents/TeamCompositionBody"

export default function PractitionerTeamCompositionPage() {
  return (
    <PractitionerLayout>
      <TeamCompositionBody />
    </PractitionerLayout>
  )
}
