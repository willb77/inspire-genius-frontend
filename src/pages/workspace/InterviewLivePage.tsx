/**
 * Interview Live — a REAL, scored interview of a candidate. The candidate is
 * NOT the signed-in user. Forked from /interview-practice (candidate-side
 * rehearsal).
 *
 * Shared by managers and practitioners (ROLE-C): mounted at /manager/* and
 * /practitioner/*, with `audience` set by the route to pick the chrome.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import LiveInterviewBody from "@/components/interview/LiveInterviewBody"

export default function WorkspaceInterviewLivePage({ audience }: { audience: WorkspaceAudience }) {
  return (
    <WorkspaceLayout audience={audience}>
      <LiveInterviewBody />
    </WorkspaceLayout>
  )
}
