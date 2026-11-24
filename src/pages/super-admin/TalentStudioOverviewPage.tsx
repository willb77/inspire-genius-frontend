/**
 * /super-admin/talent-studio — Talent Studio Overview (TS-2) for the platform
 * owner. Thin layout wrapper around the shared body.
 */
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import TalentStudioOverviewBody from "@/components/talent-studio/TalentStudioOverviewBody"

export default function SuperAdminTalentStudioOverviewPage() {
  return (
    <SuperAdminLayout>
      <TalentStudioOverviewBody role="super-admin" />
    </SuperAdminLayout>
  )
}
