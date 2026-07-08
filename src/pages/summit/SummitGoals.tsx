import { Heart, Brain, Gauge, Users, Target, Info } from "lucide-react";
import { GOALS, type Goal } from "@/pages/summit/summitData";
import { PageHead, Card, Callout, StatusPill } from "@/pages/summit/components/ui";
import { cn } from "@/lib/utils";

const ALIGN_STYLES: Record<Goal["align"], string> = {
  lever: "bg-[#5B8A72]/14 text-[#5B8A72]",
  stretch: "bg-[#C2614F]/13 text-[#C2614F]",
  counter: "bg-[#F1ECE2] text-[#13294B]",
};

export function GoalCard({ g }: { g: Goal }) {
  return (
    <Card className="!p-[19px]">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[#0E5F6B]">{g.cat}</div>
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <div className="text-base font-bold leading-snug text-[#0B1B33]">{g.title}</div>
        <StatusPill status={g.status} label={g.status} />
      </div>
      <div className="mt-2.5 flex gap-2 rounded-xl border-l-[3px] border-[#C88B1B] bg-[#FBF7F0] px-3 py-2.5 text-[13px] leading-snug text-[#13294B]">
        <Heart className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#C88B1B]" />
        <span>
          <b className="text-[#0B1B33]">Why it matters:</b> {g.why}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#127A8A]/13 px-2.5 py-1.5 text-[11.5px] font-semibold text-[#0E5F6B]">
          <Brain className="h-3 w-3" /> {g.prism}
        </span>
        <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold", ALIGN_STYLES[g.align])}>
          {g.alignLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1ECE2] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#13294B]">
          <Gauge className="h-3 w-3" /> {g.style}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1B33] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#FBF7F0]">
          <Users className="h-3 w-3" /> {g.coach}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-[#13294B]">
        <Target className="h-3.5 w-3.5 text-[#127A8A]" />
        <span>
          <b>Success:</b> {g.metric}
        </span>
      </div>
    </Card>
  );
}

export default function SummitGoals() {
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="Structured, and provisional until you confirm"
        title="Your goals"
        sub="Each theme from discovery becomes a goal with a real motivation, a PRISM alignment, a quadrant-tailored plan, a success metric, and an owning coach. Summit proposes — you ratify."
      />
      <Callout tone="info" icon={<Info className="h-4 w-4 text-[#1D3A66]" />}>
        A goal marked <strong>Requires stretch</strong> isn't a weakness call — it's a deliberate, time-boxed move against type, backed by a neuroplasticity plan so it doesn't burn you out.
      </Callout>
      <div className="flex flex-col gap-3">
        {GOALS.map((g) => (
          <GoalCard key={g.title} g={g} />
        ))}
      </div>
    </div>
  );
}
