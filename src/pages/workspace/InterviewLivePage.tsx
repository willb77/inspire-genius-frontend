/**
 * Interview Live — a REAL, scored interview of a candidate. The candidate is
 * NOT the signed-in user. Forked from /interview-practice (candidate-side
 * rehearsal).
 *
 * Shared by managers and practitioners (ROLE-C): mounted at /manager/* and
 * /practitioner/*, with `audience` set by the route to pick the chrome.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"
import InterviewHouseLinks from "@/components/interview/house/InterviewHouseLinks"
import LiveInterviewBody from "@/components/interview/LiveInterviewBody"
import InterviewRunBody from "@/components/interview/house/run/InterviewRunBody"
import TalentStudioStageTabs from "@/components/talent-studio/TalentStudioStageTabs"
import { useTalentStudioStageTabsHere } from "@/hooks/nav/useToolsSection"

export default function WorkspaceInterviewLivePage({ audience }: { audience: WorkspaceAudience }) {
  // House style (interview area, OFF by default): links to the sibling pages,
  // and the one interview build starting on "Hiring". Off: Live as today.
  const house = isHouseStyleOn("interview")
  // RM-7: where the Interviews stage tabs show, they carry every sibling link,
  // so the house link row is not shown as well.
  const stageTabs = useTalentStudioStageTabsHere(audience) !== null
  return (
    <WorkspaceLayout audience={audience}>
      <TalentStudioStageTabs role={audience} />
      {house && !stageTabs && <InterviewHouseLinks audience={audience} current="live" />}
      {house ? <InterviewRunBody initialKind="hiring" /> : <LiveInterviewBody />}
    </WorkspaceLayout>
  )
}
