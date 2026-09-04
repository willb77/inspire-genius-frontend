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
import { ArrowLeft, Brain, FileText, TrendingUp } from "lucide-react";
import { PageHead, Card } from "@/pages/summit/components/ui";
import { ROUTES } from "@/constants/routes";

const PLANNED = [
  { icon: Brain, title: "PRISM lens", body: "Your goals read against your own PRISM profile — which ones lean on a strength, which ask for a stretch." },
  { icon: TrendingUp, title: "Progress", body: "Milestones and check-ins against each goal, with your coach's reviews beside them." },
  { icon: FileText, title: "Documents", body: "A résumé, bio or profile drafted from your real history and goals — never from a template career." },
] as const;

export default function SummitComingSoon() {
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="Not built yet"
        title="Coming soon"
        sub="These three panels are planned. They will read your own data or they will not show at all."
      />
      <div className="flex flex-col gap-3">
        {PLANNED.map((p) => (
          <Card key={p.title} className="flex items-start gap-4 !p-[19px]">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[#F1ECE2] text-[#13294B]">
              <p.icon className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <div className="text-[15px] font-bold text-[#0B1B33]">{p.title}</div>
              <p className="mt-1 text-[13.5px] leading-snug text-[#13294B]/80">{p.body}</p>
            </div>
          </Card>
        ))}
      </div>
      <Link to={ROUTES.MY_GOALS.BASE} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E5F6B]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to your goals
      </Link>
    </div>
  );
}
