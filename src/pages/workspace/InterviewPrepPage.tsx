/**
 * Interview Prep — Maven (InterviewAgent) interview prep (Combined Plan §A.E3.4).
 *
 * Shared by managers and practitioners (ROLE-C): mounted at /manager/* and
 * /practitioner/*, with `audience` set by the route to pick the chrome.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"
import InterviewHouseLinks from "@/components/interview/house/InterviewHouseLinks"
import InterviewPrepBody from "@/components/task-agents/InterviewPrepBody"

export default function WorkspaceInterviewPrepPage({ audience }: { audience: WorkspaceAudience }) {
  return (
    <WorkspaceLayout audience={audience}>
      {/* House style (interview area, OFF by default): links to the sibling pages. */}
      {isHouseStyleOn("interview") && <InterviewHouseLinks audience={audience} current="prep" />}
      <InterviewPrepBody />
    </WorkspaceLayout>
  )
}
