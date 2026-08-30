import { Link } from "react-router-dom";
import { Layers, Brain, Users, Check, Target } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { MILESTONES, DELTAS } from "@/pages/summit/summitData";
import { PageHead, Card, MiniLabel, SampleNotice } from "@/pages/summit/components/ui";
import { cn } from "@/lib/utils";

export default function SummitProgress() {
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="Goal-setting is never one-and-done"
        title="Your living goal plan"
        sub="Goals persist to a shared store every agent can read, reference, and update. As your situation shifts, the plan re-ranks — and tells you exactly what changed and why."
      />

      {/* Milestones and the change history are decoration: the goal session is
          overwritten in place with no revision table, and milestones live on a
          different (manager-facing) service entirely. Your real goals are on
          My Goals — this page is the shape of what's coming. */}
      <SampleNotice what="Milestones and the change history aren't kept yet, so these are illustrative; your real goals are on My Goals." />

      <Card className="flex items-center justify-between gap-4 border-none bg-gradient-to-br from-[#0B1B33] to-[#1D3A66]">
        <div>
          <div className="text-[11.5px] font-bold uppercase tracking-wide text-slate-400">Active goal plan · v3</div>
          <h3 className="mt-1.5 font-serif text-xl text-[#FBF7F0]">4 goals · 1 confirmed · 1 in progress · 2 proposed</h3>
          <div className="mt-3 flex flex-wrap gap-4 text-[13.5px] font-semibold text-[#7FD3DF]">
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> 3 of 5 categories explored
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Gold-tailored pacing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> 3 coaches engaged
            </span>
          </div>
        </div>
        <Link to={ROUTES.SUMMIT.GOALS} className="flex-shrink-0 rounded-xl bg-[#127A8A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white hover:text-[#0B1B33]">
          View goals
        </Link>
      </Card>

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
        <Card>
          <MiniLabel>Milestones</MiniLabel>
          <div className="mt-2 flex flex-col gap-2.5">
            {MILESTONES.map((m, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-[#FBF7F0] px-3.5 py-3">
                <div className={cn("grid h-6 w-6 flex-shrink-0 place-items-center rounded-md", m.done ? "bg-[#5B8A72] text-white" : "bg-[#F1ECE2] text-[#7C93B5]")}>
                  {m.done ? <Check className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1">
                  <div className={cn("text-[13.5px]", m.done ? "text-[#0B1B33]" : "text-[#13294B]")}>{m.txt}</div>
                  <div className="text-[11px] text-[#7C93B5]">{m.goal}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <MiniLabel>Plan history · what changed</MiniLabel>
          <div className="mt-3.5 flex flex-col gap-3.5">
            {DELTAS.map((d, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: d.tone }} />
                <div>
                  <div className="text-xs font-bold text-[#7C93B5]">{d.when}</div>
                  <div className="mt-0.5 text-[13.5px] leading-snug text-[#13294B]">{d.text}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
