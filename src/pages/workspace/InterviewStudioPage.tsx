/**
 * Interview Studio — a flexible, scored interview built from your own
 * questions or generated from a topic.
 *
 * Shared by managers and practitioners (ROLE-C): mounted at /manager/* and
 * /practitioner/*, with `audience` set by the route to pick the chrome.
 */
import WorkspaceLayout, { type WorkspaceAudience } from "@/layouts/WorkspaceLayout"
import StudioInterviewBody from "@/components/interview/StudioInterviewBody"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"
import InterviewHouseLinks from "@/components/interview/house/InterviewHouseLinks"
import InterviewRunBody from "@/components/interview/house/run/InterviewRunBody"
import TalentStudioStageTabs from "@/components/talent-studio/TalentStudioStageTabs"
import { useTalentStudioStageTabsHere } from "@/hooks/nav/useToolsSection"

/**
 * House style (interview area, OFF by default): the one interview build,
 * starting on "Your own questions". It reads `?session=<id>` itself, so a row
 * in the manager's list opens here. Switch off, the Studio body as today.
 */
export default function WorkspaceInterviewStudioPage({ audience }: { audience: WorkspaceAudience }) {
  const house = isHouseStyleOn("interview")
  // RM-7: the Interviews stage tabs replace the house link row where they show.
  const stageTabs = useTalentStudioStageTabsHere(audience) !== null
  return (
    <WorkspaceLayout audience={audience}>
      <TalentStudioStageTabs role={audience} />
      {house && !stageTabs && <InterviewHouseLinks audience={audience} current="studio" />}
      {house ? <InterviewRunBody initialKind="own" /> : <StudioInterviewBody />}
    </WorkspaceLayout>
  )
}
