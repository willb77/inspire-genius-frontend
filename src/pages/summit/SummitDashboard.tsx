import { Link } from "react-router-dom";
import { Check, Layers, ChevronRight, ArrowRight, Brain } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { CATEGORIES, GOALS } from "@/pages/summit/summitData";
import { PageHead, Card, MiniLabel, CardH, Callout, PrismBars } from "@/pages/summit/components/ui";
import { GoalCard } from "@/pages/summit/SummitGoals";

export default function SummitDashboard() {
  const explored = CATEGORIES.filter((c) => c.status === "explored").length;
  const pct = Math.round((explored / CATEGORIES.length) * 100);

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="Your goal-setting journey"
        title="You're wired to make messy systems run, Daniel."
        sub="Summit reads how you're wired — your PRISM brain map — and turns an exploratory conversation into goals that leverage your natural strengths, then routes each one to the right coach."
      />

      <Card className="!p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <MiniLabel>Discovery progress · {explored} of 5 categories</MiniLabel>
            <div className="font-serif text-2xl text-[#0B1B33]">{pct}% explored</div>
          </div>
          <Link
            to={ROUTES.SUMMIT.DISCOVERY}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#127A8A] px-3.5 py-2 text-[13px] font-bold text-white hover:bg-[#0E5F6B]"
          >
            Resume <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1.5">
          {CATEGORIES.map((c) => {
            const done = c.status === "explored";
            const active = c.status === "active";
            return (
              <div key={c.key} className="flex min-w-[120px] flex-1 flex-col items-center gap-2 text-center">
                <div
                  className={`grid h-9 w-9 place-items-center rounded-full ${
                    done ? "bg-[#5B8A72] text-white" : active ? "bg-[#127A8A] text-white ring-4 ring-[#127A8A]/20" : "bg-[#F1ECE2] text-[#7C93B5]"
                  }`}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#7C93B5]">Category {c.n}</div>
                  <div className={`text-[11px] leading-tight ${active ? "font-semibold text-[#0B1B33]" : "text-[#13294B]"}`}>{c.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
        <Card className="relative overflow-hidden bg-gradient-to-br from-white to-[#F1ECE2]">
          <MiniLabel>Your next step</MiniLabel>
          <CardH>Finish the Workplace category</CardH>
          <p className="mb-3.5 text-[14.5px] leading-relaxed text-[#13294B]/80">
            You're a Gold-dominant profile in a high-churn reorg — a stress signal worth naming. Let's explore how change lands for you before we set the goal.
          </p>
          <Link
            to={ROUTES.SUMMIT.DISCOVERY}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B1B33] px-4 py-2.5 text-sm font-semibold text-[#FBF7F0] hover:bg-[#1D3A66]"
          >
            Continue discovery <ChevronRight className="h-4 w-4" />
          </Link>
        </Card>
        <Card>
          <MiniLabel>Behavioral signature · Aura</MiniLabel>
          <CardH>How you're wired</CardH>
          <PrismBars compact />
          <p className="mt-3 text-[13px] leading-relaxed text-[#13294B]/80">
            Dominant quadrant: <strong>Gold</strong> (Finishing + Evaluating). Top signals: <strong>Evaluating</strong>, <strong>Finishing</strong>, <strong>Supporting</strong> — a stability-seeking, quality-first profile.
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <div>
            <MiniLabel>Goals surfaced so far · Summit</MiniLabel>
            <CardH>Goals built on how you think</CardH>
          </div>
          <Link to={ROUTES.SUMMIT.GOALS} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E5F6B]">
            See all 4 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {GOALS.slice(0, 2).map((g) => (
            <GoalCard key={g.title} g={g} />
          ))}
        </div>
      </Card>

      <Callout tone="brain" icon={<Brain className="h-4 w-4 text-[#0E5F6B]" />}>
        Every goal here is aligned to your brain map: we prefer goals that <strong>leverage your natural strengths</strong>, and we frame any stretch as a conscious, time-boxed adaptation — never a permanent rewrite of who you are.
      </Callout>
    </div>
  );
}
