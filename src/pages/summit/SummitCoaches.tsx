import { Briefcase, TrendingUp, Brain, GitBranch, Sparkles } from "lucide-react";
import { COACHES, type Coach } from "@/pages/summit/summitData";
import { PageHead, Card, Callout } from "@/pages/summit/components/ui";

const ICONS: Record<string, typeof Briefcase> = {
  briefcase: Briefcase,
  trend: TrendingUp,
  brain: Brain,
};

function CoachCard({ c }: { c: Coach }) {
  const Icon = ICONS[c.icon] ?? Briefcase;
  return (
    <Card className="flex items-center gap-4 !py-[17px]">
      <div className="grid h-[46px] w-[46px] flex-shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-[#13294B] to-[#1D3A66] text-[#7FD3DF]">
        <Icon className="h-[22px] w-[22px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold text-[#0B1B33]">{c.role}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#7C93B5]">
          <GitBranch className="h-3 w-3" /> {c.agents}
        </div>
        <div className="mt-1.5 text-[13px] leading-snug text-[#13294B]/85">{c.focus}</div>
      </div>
      <div className="flex-shrink-0 rounded-xl border border-slate-200 bg-[#FBF7F0] px-3.5 py-2.5 text-center">
        <b className="block font-serif text-xl text-[#0B1B33]">{c.count}</b>
        <span className="text-[10.5px] uppercase tracking-wide text-[#7C93B5]">goal{c.count === 1 ? "" : "s"}</span>
      </div>
    </Card>
  );
}

export default function SummitCoaches() {
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="Discover, structure, route"
        title="Your coaching team"
        sub="Summit doesn't coach the goals itself — it hands each one to the specialist who owns that kind of growth, then Meridian brings their work back to you in one voice."
      />
      <div className="flex flex-col gap-3">
        {COACHES.map((c) => (
          <CoachCard key={c.role} c={c} />
        ))}
      </div>
      <Callout tone="sage" icon={<Sparkles className="h-4 w-4 text-[#5B8A72]" />}>
        You always hear one voice. Behind Meridian, <strong>Echo</strong> and <strong>Forge</strong> build current-role skill, <strong>Nova</strong> and <strong>Ascend</strong> plan advancement, and <strong>Aura</strong> works the behavioral foundations — each seeing only the goals routed to them.
      </Callout>
    </div>
  );
}
