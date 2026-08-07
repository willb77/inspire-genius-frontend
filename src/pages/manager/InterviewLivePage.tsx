/**
 * /manager/interview-live — a REAL, scored interview of a candidate, run by
 * the manager. The candidate is NOT the signed-in user.
 *
 * Forked from /interview-practice (candidate-side rehearsal). Thin layout
 * wrapper around the shared body, mirroring InterviewPrepPage.
 */
import ManagerLayout from "@/layouts/ManagerLayout"
import LiveInterviewBody from "@/components/interview/LiveInterviewBody"

export default function InterviewLivePage() {
  return (
    <ManagerLayout>
      <LiveInterviewBody />
    </ManagerLayout>
  )
}
