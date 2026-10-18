/**
 * Interview Prep — Maven (InterviewAgent) interview prep (Combined Plan §A.E3.4).
 *
 * Shared by managers and practitioners (ROLE-C): mounted at /manager/* and
 * /practitioner/*, with `audience` set by the route to pick the chrome.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import InterviewPrepBody from "@/components/task-agents/InterviewPrepBody"

export default function WorkspaceInterviewPrepPage({ audience }: { audience: WorkspaceAudience }) {
  return (
    <WorkspaceLayout audience={audience}>
      <InterviewPrepBody />
    </WorkspaceLayout>
  )
}
