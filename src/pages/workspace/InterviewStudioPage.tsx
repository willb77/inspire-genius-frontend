/**
 * Interview Studio — a flexible, scored interview built from your own
 * questions or generated from a topic.
 *
 * Shared by managers and practitioners (ROLE-C): mounted at /manager/* and
 * /practitioner/*, with `audience` set by the route to pick the chrome.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import StudioInterviewBody from "@/components/interview/StudioInterviewBody"

export default function WorkspaceInterviewStudioPage({ audience }: { audience: WorkspaceAudience }) {
  return (
    <WorkspaceLayout audience={audience}>
      <StudioInterviewBody />
    </WorkspaceLayout>
  )
}
