import { Briefcase, TrendingUp, Brain, GitBranch, Sparkles } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { PageHead, Card, Callout } from "@/pages/summit/components/ui";

type Coach = { id: string; role: (t: TFunction) => string; agents: string; icon: string; focus: (t: TFunction) => string };

/** The three coaching roles Goals Studio routes goals to. Product copy, correctly static. */
const COACHES: Coach[] = [
  { id: "job_mentor", role: (t: TFunction) => t("coaches.job_mentor.role", { defaultValue: "Job Mentor" }), agents: "Echo · Forge", icon: "briefcase", focus: (t: TFunction) => t("coaches.job_mentor.focus", { defaultValue: "Current-role excellence — performance, team dynamics, job-specific skills, day-to-day productivity." }) },
  { id: "career_coach", role: (t: TFunction) => t("coaches.career_coach.role", { defaultValue: "Career Coach" }), agents: "Nova · Ascend · Bridge", icon: "trend", focus: (t: TFunction) => t("coaches.career_coach.focus", { defaultValue: "Strategic advancement — next-role prep, pivots, leadership development, positioning, long-term trajectory." }) },
  { id: "prism_coach", role: (t: TFunction) => t("coaches.prism_coach.role", { defaultValue: "PRISM Coach" }), agents: "Aura", icon: "brain", focus: (t: TFunction) => t("coaches.prism_coach.focus", { defaultValue: "Behavioral effectiveness — stress, adaptability, communication style, conflict, emotional intelligence." }) },
];
import { useGoalSession } from "@/hooks/summit/useGoalSession";

const ICONS: Record<string, typeof Briefcase> = {
  briefcase: Briefcase,
  trend: TrendingUp,
  brain: Brain,
};

/**
 * The roster's descriptions are product copy and correctly static. The goal
 * COUNTS are not — they are a claim about this person's goals, and they were
 * hardcoded to the wireframe's 2/1/1 for everybody. They are derivable from the
 * live session, so derive them.
 */
function CoachCard({ c, count }: { c: Coach; count: number }) {
  const { t } = useTranslation("summitPages");
  const Icon = ICONS[c.icon] ?? Briefcase;
  return (
    <Card className="flex items-center gap-4 !py-[17px]">
      <div className="grid h-[46px] w-[46px] flex-shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-[#13294B] to-[#1D3A66] text-[#7FD3DF]">
        <Icon className="h-[22px] w-[22px]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold text-[#0B1B33]">{c.role(t)}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#7C93B5]">
          <GitBranch className="h-3 w-3" /> {c.agents}
        </div>
        <div className="mt-1.5 text-[13px] leading-snug text-[#13294B]/85">{c.focus(t)}</div>
      </div>
      <div className="flex-shrink-0 rounded-xl border border-slate-200 bg-[#FBF7F0] px-3.5 py-2.5 text-center">
        <b className="block font-serif text-xl text-[#0B1B33]">{count}</b>
        <span className="text-[10.5px] uppercase tracking-wide text-[#7C93B5]">{(count === 1 ? t("coaches.goalCount_one", { count: count, defaultValue: "goal" }) : t("coaches.goalCount_other", { count: count, defaultValue: "goals" }))}</span>
      </div>
    </Card>
  );
}

export default function SummitCoaches() {
  const { t } = useTranslation("summitPages");
  const { data: session } = useGoalSession();

  const counts = new Map<string, number>();
  for (const goal of session?.goals ?? []) {
    if (!goal.owning_coach) continue;
    counts.set(goal.owning_coach, (counts.get(goal.owning_coach) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow={t("coaches.eyebrow", { defaultValue: "Discover, structure, route" })}
        title={t("coaches.title", { defaultValue: "Your coaching team" })}
        sub={t("coaches.sub", { defaultValue: "Goals Studio doesn't coach the goals itself — it hands each one to the specialist who owns that kind of growth, then Meridian brings their work back to you in one voice." })}
      />
      <div className="flex flex-col gap-3">
        {COACHES.map((c) => (
          <CoachCard
            key={c.id}
            c={c}
            count={counts.get(c.id) ?? 0}
          />
        ))}
      </div>
      <Callout tone="sage" icon={<Sparkles className="h-4 w-4 text-[#5B8A72]" />}>
        <Trans i18nKey="coaches.callout" ns="summitPages" components={{ strong: <strong /> }}>
          You always hear one voice. Behind Meridian, <strong>Echo</strong> and <strong>Forge</strong> build current-role skill, <strong>Nova</strong> and <strong>Ascend</strong> plan advancement, and <strong>Aura</strong> works the behavioral foundations — each seeing only the goals routed to them.
        </Trans>
      </Callout>
    </div>
  );
}
