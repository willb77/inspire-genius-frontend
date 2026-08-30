import { Heart, Brain, Gauge, Users, Target, Info, Loader2 } from "lucide-react";
import { PageHead, Card, Callout, StatusPill } from "@/pages/summit/components/ui";
import { cn } from "@/lib/utils";
import { useGoalSession } from "@/hooks/summit/useGoalSession";
import type { SummitGoal } from "@/types/summit";
import {
  ALIGN_LABEL,
  ALIGN_STYLES,
  alignKind,
  categoryLabel,
  coachLabel,
  goalStatusLabel,
  prismSummary,
  styleLabel,
} from "@/pages/summit/_summit";

/**
 * Every field on this card is optional in the live contract, and each one is
 * dropped rather than defaulted when it is absent. A goal synthesised without a
 * behavioural profile behind it genuinely has no PRISM alignment, and inventing
 * a neutral-looking pill would claim a reading that was never taken — which is
 * the specific failure this page is being repaired from.
 */
export function GoalCard({ g }: { g: SummitGoal }) {
  const cat = categoryLabel(g.category);
  const align = alignKind(g.prism_alignment);
  const prism = prismSummary(g.prism_alignment);
  const style = styleLabel(g.execution_style);
  const coach = coachLabel(g.owning_coach);

  return (
    <Card className="!p-[19px]">
      {cat && (
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#0E5F6B]">{cat}</div>
      )}
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <div className="text-base font-bold leading-snug text-[#0B1B33]">{g.title}</div>
        <StatusPill status={g.status} label={goalStatusLabel(g.status)} />
      </div>
      {g.motivation && (
        <div className="mt-2.5 flex gap-2 rounded-xl border-l-[3px] border-[#C88B1B] bg-[#FBF7F0] px-3 py-2.5 text-[13px] leading-snug text-[#13294B]">
          <Heart className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#C88B1B]" />
          <span>
            <b className="text-[#0B1B33]">Why it matters:</b> {g.motivation}
          </span>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {prism && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#127A8A]/13 px-2.5 py-1.5 text-[11.5px] font-semibold text-[#0E5F6B]">
            <Brain className="h-3 w-3" /> {prism}
          </span>
        )}
        {align && (
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold", ALIGN_STYLES[align])}>
            {ALIGN_LABEL[align]}
          </span>
        )}
        {style && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1ECE2] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#13294B]">
            <Gauge className="h-3 w-3" /> {style}
          </span>
        )}
        {coach && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1B33] px-2.5 py-1.5 text-[11.5px] font-semibold text-[#FBF7F0]">
            <Users className="h-3 w-3" /> {coach}
          </span>
        )}
      </div>
      {g.success_metric && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-[#13294B]">
          <Target className="h-3.5 w-3.5 text-[#127A8A]" />
          <span>
            <b>Success:</b> {g.success_metric}
          </span>
        </div>
      )}
      {g.first_step && (
        <div className="mt-1.5 text-[12.5px] text-[#13294B]/85">
          <b>First step:</b> {g.first_step}
        </div>
      )}
    </Card>
  );
}

/** Nothing synthesised yet. The way out is the conversation, so say so. */
function NoGoalsYet() {
  return (
    <Card className="!p-5">
      <div className="text-[15px] font-bold text-[#0B1B33]">No goals yet</div>
      <p className="mt-1.5 text-[14px] leading-relaxed text-[#13294B]/80">
        Goals here are written out of the discovery conversation rather than typed
        into a form, so this page fills up as you talk to Summit — on the right of
        this screen. Work through a category or two and they&apos;ll appear, each
        with the reason underneath it.
      </p>
    </Card>
  );
}

export default function SummitGoals() {
  const { data: session, isLoading, isError } = useGoalSession();
  const goals = session?.goals ?? [];

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="Structured, and provisional until you confirm"
        title="Your goals"
        sub="Each theme from discovery becomes a goal with a real motivation, a PRISM alignment, a quadrant-tailored plan, a success metric, and an owning coach. Summit proposes — you ratify."
      />
      <Callout tone="info" icon={<Info className="h-4 w-4 text-[#1D3A66]" />}>
        A goal marked <strong>Requires stretch</strong> isn&apos;t a weakness call — it&apos;s a deliberate, time-boxed move against type, backed by a neuroplasticity plan so it doesn&apos;t burn you out.
      </Callout>

      {isLoading && (
        <div className="flex items-center gap-2 text-[13.5px] text-[#13294B]/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Reading your goals…
        </div>
      )}

      {!isLoading && isError && (
        <Card className="!p-5">
          <p className="text-[14px] text-[#13294B]/80">
            We couldn&apos;t read your goals just now. Refresh to try again — nothing
            you&apos;ve worked through has been lost.
          </p>
        </Card>
      )}

      {!isLoading && !isError && goals.length === 0 && <NoGoalsYet />}

      {!isLoading && !isError && goals.length > 0 && (
        <div className="flex flex-col gap-3">
          {goals.map((g) => (
            <GoalCard key={g.goal_id} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}
