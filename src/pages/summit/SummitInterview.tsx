/**
 * The interview — Summit's structured, voice-first goal conversation, on its
 * own page (Goals offering, Phase 3). It used to sit in a rail on the right
 * of every Summit page as a text panel; the voice panel needs the width.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Info } from "lucide-react";
import { PageHead, Callout } from "@/pages/summit/components/ui";
import { ROUTES } from "@/constants/routes";
import GoalInterviewPanel from "@/components/direction-setting/GoalInterviewPanel";

export default function SummitInterview() {
  const [synthesised, setSynthesised] = useState(0);
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="A conversation, not a form"
        title="Talk it through with Summit"
        sub="Five areas of your working life, a category at a time, with the WHY ladder underneath each stated goal. Voice leads; text is one toggle away."
      />
      {synthesised > 0 && (
        <Callout tone="info" icon={<Info className="h-4 w-4 text-[#1D3A66]" />}>
          {synthesised} goal{synthesised === 1 ? "" : "s"} drafted from this conversation.{" "}
          <Link to={ROUTES.MY_GOALS.BASE} className="inline-flex items-center gap-1 font-semibold text-[#0E5F6B]">
            Review and publish them <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Callout>
      )}
      <GoalInterviewPanel onGoalsSynthesised={setSynthesised} />
    </div>
  );
}
