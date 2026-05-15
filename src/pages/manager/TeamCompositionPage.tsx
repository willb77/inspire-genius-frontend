/**
 * /manager/team-composition — Atlas (DashboardAgent) team composition (Combined Plan §A.E3.4).
 *
 * Wave 4 Lane 4.D (P7.2) — body extracted to components/task-agents/TeamCompositionBody.tsx
 * and reused by /practitioner/team-composition.
 */
import ManagerLayout from "@/layouts/ManagerLayout"
import TeamCompositionBody from "@/components/task-agents/TeamCompositionBody"

export default function TeamCompositionPage() {
  return (
    <ManagerLayout>
      <TeamCompositionBody />
    </ManagerLayout>
  )
}
