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

/**
 * House style (interview area, OFF by default): `?session=<id>` opens a stored
 * interview, the way Live Interview's address already does, so a row in the
 * manager's list can open it. Read from the address directly so the switch-off
 * page needs nothing it did not need before.
 */
function sessionFromAddress(): string | undefined {
  try {
    return new URLSearchParams(window.location.search).get("session") || undefined
  } catch {
    return undefined
  }
}

export default function WorkspaceInterviewStudioPage({ audience }: { audience: WorkspaceAudience }) {
  const house = isHouseStyleOn("interview")
  return (
    <WorkspaceLayout audience={audience}>
      {house && <InterviewHouseLinks audience={audience} current="studio" />}
      <StudioInterviewBody openSessionId={house ? sessionFromAddress() : undefined} />
    </WorkspaceLayout>
  )
}
