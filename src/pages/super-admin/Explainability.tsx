import { useParams } from "react-router-dom"

import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { ConversationList } from "@/components/explainability/ConversationList"
import { TurnTimeline } from "@/components/explainability/TurnTimeline"
import { TurnAnalysisCard } from "@/components/explainability/TurnAnalysisCard"

export default function Explainability() {
  const params = useParams<{ sessionId?: string; turnId?: string }>()
  return (
    <SuperAdminLayout>
      <div
        className="grid h-full min-h-[calc(100vh-4rem)] grid-cols-12 overflow-hidden"
        data-testid="explainability-shell"
      >
        <ConversationList className="col-span-3" selectedSessionId={params.sessionId} />
        <TurnTimeline
          className="col-span-6"
          sessionId={params.sessionId}
          selectedTurnId={params.turnId}
        />
        <TurnAnalysisCard className="col-span-3" turnId={params.turnId} />
      </div>
    </SuperAdminLayout>
  )
}
