/**
 * The honest page (Goals offering, Phase 3).
 *
 * Three Summit panels — the PRISM lens, Progress and Documents — used to
 * render a wireframe's invented figures for a person who never existed, each
 * behind a "sample" notice. A profile you never took, a history you never
 * had, and a CV of a career that was not yours are not a preview; they are a
 * claim. Until the endpoints exist, this page says what is coming and nothing
 * more.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { ArrowLeft, Brain, FileText, TrendingUp } from "lucide-react";
import { PageHead, Card } from "@/pages/summit/components/ui";
import { ROUTES } from "@/constants/routes";

const PLANNED = [
  { id: "prism", icon: Brain, title: (t: TFunction) => t("comingSoon.prism.title", { defaultValue: "PRISM lens" }), body: (t: TFunction) => t("comingSoon.prism.body", { defaultValue: "Your goals read against your own PRISM profile — which ones lean on a strength, which ask for a stretch." }) },
  { id: "progress", icon: TrendingUp, title: (t: TFunction) => t("comingSoon.progress.title", { defaultValue: "Progress" }), body: (t: TFunction) => t("comingSoon.progress.body", { defaultValue: "Milestones and check-ins against each goal, with your coach's reviews beside them." }) },
  { id: "documents", icon: FileText, title: (t: TFunction) => t("comingSoon.documents.title", { defaultValue: "Documents" }), body: (t: TFunction) => t("comingSoon.documents.body", { defaultValue: "A résumé, bio or profile drafted from your real history and goals — never from a template career." }) },
] as const;

export default function SummitComingSoon() {
  const { t } = useTranslation("summitPages");
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow={t("comingSoon.eyebrow", { defaultValue: "Not built yet" })}
        title={t("comingSoon.title", { defaultValue: "Coming soon" })}
        sub={t("comingSoon.sub", { defaultValue: "These three panels are planned. They will read your own data or they will not show at all." })}
      />
      <div className="flex flex-col gap-3">
        {PLANNED.map((p) => (
          <Card key={p.id} className="flex items-start gap-4 !p-[19px]">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[#F1ECE2] text-[#13294B]">
              <p.icon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <div className="text-[15px] font-bold text-[#0B1B33]">{p.title(t)}</div>
              <p className="mt-1 text-[13.5px] leading-snug text-[#13294B]/80">{p.body(t)}</p>
            </div>
          </Card>
        ))}
      </div>
      <Link to={ROUTES.MY_GOALS.BASE} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E5F6B]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("comingSoon.back", { defaultValue: "Back to your goals" })}
      </Link>
    </div>
  );
}
