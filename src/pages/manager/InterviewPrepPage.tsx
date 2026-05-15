/**
 * /manager/interview-prep — Maven (InterviewAgent) interview prep (Combined Plan §A.E3.4).
 *
 * Wave 4 Lane 4.D (P7.2) — body extracted to components/task-agents/InterviewPrepBody.tsx
 * and reused by /practitioner/interview-prep.
 */
import ManagerLayout from "@/layouts/ManagerLayout"
import InterviewPrepBody from "@/components/task-agents/InterviewPrepBody"

export default function InterviewPrepPage() {
  return (
    <ManagerLayout>
      <InterviewPrepBody />
    </ManagerLayout>
  )
}
