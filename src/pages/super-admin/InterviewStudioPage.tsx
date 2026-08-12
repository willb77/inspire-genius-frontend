/**
 * /super-admin/interview-studio — Interview Studio for the platform owner.
 * Thin layout wrapper around the shared body.
 */
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import StudioInterviewBody from "@/components/interview/StudioInterviewBody"

export default function SuperAdminInterviewStudioPage() {
  return (
    <SuperAdminLayout>
      <StudioInterviewBody />
    </SuperAdminLayout>
  )
}
