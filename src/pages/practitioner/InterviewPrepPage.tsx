/**
 * /practitioner/interview-prep — Maven (InterviewAgent) interview prep.
 *
 * Wave 4 Lane 4.D (P7.2) — mirrors /manager/interview-prep with the
 * practitioner layout. Form body lives in components/task-agents/InterviewPrepBody.tsx.
 */
import PractitionerLayout from "@/layouts/PractitionerLayout"
import InterviewPrepBody from "@/components/task-agents/InterviewPrepBody"

export default function PractitionerInterviewPrepPage() {
  return (
    <PractitionerLayout>
      <InterviewPrepBody />
    </PractitionerLayout>
  )
}
