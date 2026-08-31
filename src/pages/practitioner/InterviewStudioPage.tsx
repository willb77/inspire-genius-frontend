/**
 * /practitioner/interview-studio — Interview Studio for the practitioner.
 * Thin layout wrapper around the shared body (mirrors InterviewLivePage).
 */
import PractitionerLayout from "@/layouts/PractitionerLayout"
import StudioInterviewBody from "@/components/interview/StudioInterviewBody"

export default function PractitionerInterviewStudioPage() {
  return (
    <PractitionerLayout>
      <StudioInterviewBody />
    </PractitionerLayout>
  )
}
