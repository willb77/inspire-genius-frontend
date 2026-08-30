/**
 * /practitioner/interview-live — a REAL, scored interview of a candidate, run
 * by the practitioner. The candidate is NOT the signed-in user.
 *
 * Forked from /interview-practice (candidate-side rehearsal). Thin layout
 * wrapper around the shared body, mirroring InterviewPrepPage.
 */
import PractitionerLayout from "@/layouts/PractitionerLayout"
import LiveInterviewBody from "@/components/interview/LiveInterviewBody"

export default function PractitionerInterviewLivePage() {
  return (
    <PractitionerLayout>
      <LiveInterviewBody />
    </PractitionerLayout>
  )
}
