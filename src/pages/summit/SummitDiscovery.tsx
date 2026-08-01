import { Check, Flag, Info, Heart, Loader2 } from "lucide-react";
import { LADDER } from "@/pages/summit/summitData";
import { PageHead, Card, MiniLabel, CardH, StatusPill } from "@/pages/summit/components/ui";
import { cn } from "@/lib/utils";
import { useGoalSession, useSummitCategories } from "@/hooks/summit/useGoalSession";

const STATUS_LABEL = { explored: "Explored", active: "In progress", todo: "Not started" } as const;

export default function SummitDiscovery() {
  const { data: session, isLoading, isError } = useGoalSession();
  const categories = useSummitCategories(session);

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="The five-category conversation"
        title="Discovery, not a questionnaire"
        sub="Summit gathers organically across sessions. For each category it explores, probes for patterns, runs the WHY ladder to your true motivation, then converts the discussion into candidate goals."
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-[13.5px] text-[#13294B]/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Reading your progress…
        </div>
      )}

      {!isLoading && isError && (
        <Card className="!p-5">
          <p className="text-[14px] text-[#13294B]/80">
            We couldn&apos;t read your progress just now. Refresh to try again —
            nothing you&apos;ve worked through has been lost.
          </p>
        </Card>
      )}

      {!isLoading && !isError && (
        <div className="flex flex-col gap-2.5">
          {categories.map((c) => (
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
                {/* `summary` is written by the discovery save and is often "".
                    An empty string renders nothing rather than an empty row. */}
                {c.summary && (
                  <p className="mt-1.5 text-[13.5px] leading-snug text-[#13294B]/85">{c.summary}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-3.5 text-[12px] text-[#7C93B5]">
                  <span className="inline-flex items-center gap-1.5">
                    <Flag className="h-3 w-3" /> {c.goalCount} goal{c.goalCount === 1 ? "" : "s"} surfaced
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Info className="h-3 w-3" />
                    {c.answers.length} question{c.answers.length === 1 ? "" : "s"} answered
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        {/* Illustration, not this person's data. It was previously headed "Live
            example", which read as a transcript of their own conversation. */}
        <MiniLabel>How it works · the WHY ladder</MiniLabel>
        <CardH>How &quot;better leadership&quot; becomes a real goal</CardH>
        <p className="mb-3 text-[14.5px] leading-relaxed text-[#13294B]/80">
          We don&apos;t stop at the first answer. Asking &quot;why&quot; a few times
          reaches the motivation the goal actually hooks onto. This is an example of
          the shape it takes — yours will be in your own words.
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
