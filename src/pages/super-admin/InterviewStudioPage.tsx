/**
 * /super-admin/interview-studio — Interview Studio for the platform owner.
 * Thin layout wrapper around the shared body.
 */
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import StudioInterviewBody from "@/components/interview/StudioInterviewBody"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"
import InterviewRunBody from "@/components/interview/house/run/InterviewRunBody"

export default function SuperAdminInterviewStudioPage() {
  // House style (interview area, OFF by default): the one interview build.
  return (
    <SuperAdminLayout>
      {isHouseStyleOn("interview") ? <InterviewRunBody initialKind="own" /> : <StudioInterviewBody />}
    </SuperAdminLayout>
  )
}
