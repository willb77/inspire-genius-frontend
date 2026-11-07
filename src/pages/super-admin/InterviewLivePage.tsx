/**
 * /super-admin/interview-live — a REAL, scored interview of a candidate, run by
 * the platform owner. The candidate is NOT the signed-in user.
 *
 * Added 2026-08-12: Live Interview already existed for manager and practitioner
 * but had no super-admin route, so the Tools menu had nothing to link to. Thin
 * layout wrapper around the shared body, mirroring the manager and practitioner
 * pages exactly — the body is where the behaviour lives.
 */
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import LiveInterviewBody from "@/components/interview/LiveInterviewBody"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"
import InterviewRunBody from "@/components/interview/house/run/InterviewRunBody"

export default function SuperAdminInterviewLivePage() {
  // House style (interview area, OFF by default): the one interview build.
  return (
    <SuperAdminLayout>
      {isHouseStyleOn("interview") ? <InterviewRunBody initialKind="hiring" /> : <LiveInterviewBody />}
    </SuperAdminLayout>
  )
}
