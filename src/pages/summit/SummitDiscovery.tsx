import { Check, Flag, Info, Heart } from "lucide-react";
import { CATEGORIES, LADDER } from "@/pages/summit/summitData";
import { PageHead, Card, MiniLabel, CardH, StatusPill } from "@/pages/summit/components/ui";
import { cn } from "@/lib/utils";

const STATUS_LABEL = { explored: "Explored", active: "In progress", todo: "Not started" } as const;

export default function SummitDiscovery() {
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="The five-category conversation"
        title="Discovery, not a questionnaire"
        sub="Summit gathers organically across sessions. For each category it explores, probes for patterns, runs the WHY ladder to your true motivation, then converts the discussion into candidate goals."
      />

      <div className="flex flex-col gap-2.5">
        {CATEGORIES.map((c) => (
          <Card key={c.key} className="flex gap-4 !p-[18px]">
            <div
              className={cn(
                "grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] text-sm font-bold",
                c.status === "explored" ? "bg-[#5B8A72] text-white" : c.status === "active" ? "bg-[#127A8A] text-white" : "bg-[#F1ECE2] text-[#7C93B5]",
              )}
            >
              {c.status === "explored" ? <Check className="h-4 w-4" /> : c.n}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[15.5px] font-bold text-[#0B1B33]">{c.label}</span>
                <StatusPill status={c.status} label={STATUS_LABEL[c.status]} />
              </div>
              <p className="mt-1.5 text-[13.5px] leading-snug text-[#13294B]/85">{c.insight}</p>
              <div className="mt-2 flex flex-wrap gap-3.5 text-[12px] text-[#7C93B5]">
                <span className="inline-flex items-center gap-1.5">
                  <Flag className="h-3 w-3" /> {c.goals} goal{c.goals === 1 ? "" : "s"} surfaced
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Info className="h-3 w-3" /> {c.summary}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <MiniLabel>Live example · the WHY ladder</MiniLabel>
        <CardH>How "better leadership" became a real goal</CardH>
        <p className="mb-3 text-[14.5px] leading-relaxed text-[#13294B]/80">
          We don't stop at the first answer. Asking "why" a few times reaches the motivation the goal actually hooks onto.
        </p>
        <div className="flex flex-col">
          {LADDER.map((r, i) => (
            <div key={i} className="relative flex gap-3.5 pb-4">
              {i < LADDER.length - 1 && <span className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-200" />}
              <div
                className={cn(
                  "z-10 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-[11px] font-bold",
                  r.cls === "q" ? "bg-[#127A8A] text-white" : r.cls === "root" ? "bg-[#C88B1B] text-white" : "bg-[#F1ECE2] text-[#13294B]",
                )}
              >
                {r.cls === "root" ? <Heart className="h-3.5 w-3.5" /> : r.cls === "q" ? "?" : <Check className="h-3 w-3" />}
              </div>
              <div className="pt-1">
                <div className={cn("text-[10.5px] font-bold uppercase tracking-wide", r.cls === "root" ? "text-[#A9720F]" : "text-[#7C93B5]")}>
                  {r.role}
                </div>
                <div className={cn("mt-0.5 text-[13.5px] leading-snug text-[#0B1B33]", r.cls === "root" && "font-semibold")}>{r.body}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
