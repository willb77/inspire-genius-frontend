import { useParams } from "react-router-dom"

import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { AskBox } from "@/components/explainability/AskBox"
import { ConversationList } from "@/components/explainability/ConversationList"
import { TurnTimeline } from "@/components/explainability/TurnTimeline"
import { TurnAnalysisCard } from "@/components/explainability/TurnAnalysisCard"

export default function Explainability() {
  const params = useParams<{ sessionId?: string; turnId?: string }>()
  return (
    <SuperAdminLayout>
      {/*
        Height: `h-full` was a no-op here. Nothing in the ancestor chain
        (SidebarProvider `min-h-svh` → SidebarInset `flex-1` → the scaffold's
        `flex-1 p-4` content slot) has a DEFINITE height, so a percentage
        height had nothing to resolve against and only the `min-h` applied.
        The shell was then `100vh-4rem` tall but started ~5rem down the page,
        so its last ~5rem — the list pagination and the Ask composer — sat
        below the fold, inside an `overflow-hidden` parent that could not be
        scrolled to. Explicit `h-[calc(100vh-8rem)]` (header + the slot's
        vertical padding) makes every child's `h-full` resolve.

        Columns: the analysis pane was `col-span-3` — 25% of an already
        sidebar-reduced width — and had to host BOTH the analysis cards and
        the Ask composer. That is the "can't see results" report. Analysis is
        the reason this page exists, so it now gets the widest column, and the
        conversation list (which only needs an id, a date and a few badges)
        gives up the space.
      */}
      <div
        className="grid h-[calc(100vh-8rem)] grid-cols-12 overflow-hidden rounded-lg border"
        data-testid="explainability-shell"
      >
        <ConversationList
          className="col-span-12 md:col-span-3 lg:col-span-2"
          selectedSessionId={params.sessionId}
        />
        <TurnTimeline
          className="col-span-12 md:col-span-5 lg:col-span-5"
          sessionId={params.sessionId}
          selectedTurnId={params.turnId}
        />
        <div className="col-span-12 md:col-span-4 lg:col-span-5 flex h-full min-h-0 flex-col overflow-hidden border-l">
          <TurnAnalysisCard className="min-h-0 flex-1 border-l-0" turnId={params.turnId} />
          <AskBox turnId={params.turnId} />
        </div>
      </div>
    </SuperAdminLayout>
  )
}
