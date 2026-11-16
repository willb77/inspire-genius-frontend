/**
 * The interview — Summit's structured, voice-first goal conversation, on its
 * own page (Goals offering, Phase 3). It used to sit in a rail on the right
 * of every Summit page as a text panel; the voice panel needs the width.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Info } from "lucide-react";
import { PageHead, Callout } from "@/pages/summit/components/ui";
import { ROUTES } from "@/constants/routes";
import GoalInterviewPanel from "@/components/direction-setting/GoalInterviewPanel";
import { isHouseStyleOn } from "@/lib/house/areaSwitch";
import GoalsProgressStrip from "@/pages/summit/house/GoalsProgressStrip";

export default function SummitInterview() {
  const { t } = useTranslation("summitPages");
  const [synthesised, setSynthesised] = useState(0);
  // House style (goals, S2b): this page is "Talk it through", and Overview and
  // Discovery fold into it — so the progress they showed sits above the
  // conversation. Same session read as those pages; OFF renders today's page.
  const house = isHouseStyleOn("goals");
  return (
    <div className="flex flex-col gap-[18px]">
      {house && <GoalsProgressStrip />}
      <PageHead
        eyebrow={t("interview.eyebrow", { defaultValue: "A conversation, not a form" })}
        title={t("interview.title", { defaultValue: "Talk it through with Goals Studio" })}
        sub={t("interview.sub", { defaultValue: "Five areas of your working life, a category at a time, with the WHY ladder underneath each stated goal. Voice leads; text is one toggle away." })}
      />
      {synthesised > 0 && (
        <Callout tone="info" icon={<Info className="h-4 w-4 text-[#1D3A66]" />}>
          {(synthesised === 1 ? t("interview.drafted_one", { count: synthesised, defaultValue: "{{count}} goal drafted from this conversation." }) : t("interview.drafted_other", { count: synthesised, defaultValue: "{{count}} goals drafted from this conversation." }))}{" "}
          <Link to={ROUTES.MY_GOALS.BASE} className="inline-flex items-center gap-1 font-semibold text-[#0E5F6B]">
            {t("interview.reviewLink", { defaultValue: "Review and publish them" })} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Callout>
      )}
      <GoalInterviewPanel onGoalsSynthesised={setSynthesised} />
    </div>
  );
}
