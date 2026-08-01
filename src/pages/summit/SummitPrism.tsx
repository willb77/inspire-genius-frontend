import { Info, Sprout, Gauge } from "lucide-react";
import { MAPS, QUADS } from "@/pages/summit/summitData";
import { PageHead, Card, MiniLabel, CardH, SampleNotice } from "@/pages/summit/components/ui";
import { cn } from "@/lib/utils";

export default function SummitPrism() {
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="Working with your brain, not against it"
        title="The PRISM lens on your goals"
        sub="PRISM goal-setting aligns objectives with how you're wired. Four principles shape every goal Summit sets: align to your maps, tailor to your quadrant, exploit neuroplasticity, and reframe threat as reward."
      />

      {/* The quadrant and map figures below are the wireframe's, for a person
          who does not exist. There is no member-facing endpoint on this surface
          that returns real per-dimension scores yet — the data exists server
          side, but reaching it needs a route that has not been built. Until it
          is, say so rather than let someone read these as their own profile. */}
      <SampleNotice what="The scores and maps shown here illustrate how the PRISM lens works." />

      <Card>
        <MiniLabel>Principle 1 · Align to your brain maps</MiniLabel>
        <CardH className="text-[17px]">Underlying vs Adapted vs Consistent</CardH>
        <p className="mb-3 text-[13px] leading-relaxed text-[#13294B]/80">
          Goals shouldn't force you to constantly "falsify" your natural behavior — that drains energy and burns you out.
        </p>
        <div className="flex flex-col gap-3">
          {MAPS.map((m) => (
            <div key={m.name} className="flex items-center gap-3.5">
              <div className="w-[104px] flex-shrink-0">
                <b className="text-[13.5px] text-[#0B1B33]">{m.name}</b>
                <span className="block text-[11px] text-[#7C93B5]">{m.sub}</span>
              </div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F1ECE2]">
                <div className="h-full rounded-full" style={{ width: `${m.val}%`, background: m.hue }} />
              </div>
              <span className="w-6 text-right text-[12.5px] font-bold tabular-nums text-[#0B1B33]">{m.val}</span>
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex gap-2.5 rounded-xl border border-dashed border-[#C88B1B]/40 bg-[#C88B1B]/10 px-3.5 py-2.5 text-[12.5px] leading-snug text-[#13294B]">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#A9720F]" />
          <span>
            <b>Watch-out:</b> your Adapted map (83) runs well above your Underlying (64). You're spending real energy performing a more driving style for your role. Summit flags goals that would widen that gap — sustained, it's a burnout risk.
          </span>
        </div>
      </Card>

      <Card>
        <MiniLabel>Principle 2 · Tailor execution to your quadrant</MiniLabel>
        <CardH className="text-[17px]">Your goals take their shape from Gold</CardH>
        <p className="mb-2 text-[13px] leading-relaxed text-[#13294B]/80">
          The <em>content</em> of a goal comes from the conversation; its <em>pacing and framing</em> come from your dominant quadrant.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {QUADS.map((q) => (
            <div
              key={q.key}
              className={cn(
                "relative overflow-hidden rounded-xl border p-3.5",
                q.dominant ? "border-[#127A8A] ring-2 ring-[#127A8A]/13" : "border-slate-200",
              )}
            >
              {q.dominant && (
                <span className="absolute right-0 top-0 rounded-bl-lg bg-[#127A8A] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
                  Dominant
                </span>
              )}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold text-[#0B1B33]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: q.hue }} />
                  {q.name}
                </span>
                <span className="font-serif text-xl text-[#0B1B33]">{q.score}</span>
              </div>
              <div className="mt-0.5 text-[11.5px] text-[#7C93B5]">{q.sub}</div>
              <div className="mt-1.5 text-xs leading-snug text-[#13294B]/80">{q.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
        <Card>
          <MiniLabel>Principle 3 · Exploit neuroplasticity</MiniLabel>
          <CardH className="flex items-center gap-2 text-[17px]">
            <Sprout className="h-[18px] w-[18px] text-[#5B8A72]" /> Stretch without overload
          </CardH>
          <p className="text-[14.5px] leading-relaxed text-[#13294B]/80">
            Your "lead through ambiguity" goal needs Green — a non-preference. So we don't demand a personality transplant. We set a baseline, sequence small new habits, and give it a roadmap that grows the pathway without flooding your cognitive load.
          </p>
        </Card>
        <Card>
          <MiniLabel>Principle 4 · Reframe threat as reward</MiniLabel>
          <CardH className="flex items-center gap-2 text-[17px]">
            <Gauge className="h-[18px] w-[18px] text-[#127A8A]" /> From threat to reward
          </CardH>
          <p className="text-[14.5px] leading-relaxed text-[#13294B]/80">
            Your brain flags big goals as threats and resists. So we tie each one to <em>your</em> deeper motivation (from the WHY ladder), break it into non-threatening steps, and connect it to something you already value — so your brain reads it as a win worth chasing.
          </p>
        </Card>
      </div>
    </div>
  );
}
