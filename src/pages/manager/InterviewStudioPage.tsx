/**
 * /manager/interview-studio — Interview Studio: a flexible, scored interview
 * the manager builds from their own questions or generates from a topic.
 * Thin layout wrapper around the shared body (mirrors InterviewLivePage).
 */
import ManagerLayout from "@/layouts/ManagerLayout"
import StudioInterviewBody from "@/components/interview/StudioInterviewBody"

export default function ManagerInterviewStudioPage() {
  return (
    <ManagerLayout>
      <StudioInterviewBody />
    </ManagerLayout>
  )
}
