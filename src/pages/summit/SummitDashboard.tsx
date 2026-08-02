import { Link } from "react-router-dom";
import { Check, Layers, ChevronRight, ArrowRight, Brain, Loader2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { PageHead, Card, MiniLabel, CardH, Callout } from "@/pages/summit/components/ui";
import { GoalCard } from "@/pages/summit/SummitGoals";
import { useAuth } from "@/context/useAuth";
import { useGoalSession, useSummitCategories } from "@/hooks/summit/useGoalSession";

/** First name only, for the greeting. Falls back to a name-free headline. */
function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

export default function SummitDashboard() {
  const { user } = useAuth();
  const { data: session, isLoading, isError } = useGoalSession();
  const categories = useSummitCategories(session);
  const goals = session?.goals ?? [];

  const explored = categories.filter((c) => c.status === "explored").length;
  const pct = categories.length
    ? Math.round((explored / categories.length) * 100)
    : 0;

  // The next thing to do is the first category that isn't finished — the same
  // "first incomplete, not furthest reached" rule the Direction Setting journey
  // uses, so the two surfaces can't disagree about where someone is up to.
  const nextCategory = categories.find((c) => c.status !== "explored");

  const who = firstName(user?.name ?? user?.fullName);

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow="Your goal-setting journey"
        title={
          who
            ? `Let's turn the conversation into goals, ${who}.`
            : "Let's turn the conversation into goals."
        }
        sub="Summit works through five areas of your life, asks why until it reaches something you actually care about, and turns that into goals with the reason still attached."
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-[13.5px] text-[#13294B]/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Reading where you&apos;ve got to…
        </div>
      )}

      {!isLoading && isError && (
        <Card className="!p-5">
          <p className="text-[14px] text-[#13294B]/80">
            We couldn&apos;t read your goal-setting session just now. Refresh to try
            again — nothing you&apos;ve worked through has been lost.
          </p>
        </Card>
      )}

      {!isLoading && !isError && (
        <>
          <Card className="!p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <MiniLabel>
                  Discovery progress · {explored} of {categories.length} categories
                </MiniLabel>
                <div className="font-serif text-2xl text-[#0B1B33]">{pct}% explored</div>
              </div>
              <Link
                to={ROUTES.SUMMIT.DISCOVERY}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#127A8A] px-3.5 py-2 text-[13px] font-bold text-white hover:bg-[#0E5F6B]"
              >
                {explored === 0 ? "Start" : "Resume"} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1.5">
              {categories.map((c) => {
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

          {nextCategory && (
            <Card className="relative overflow-hidden bg-gradient-to-br from-white to-[#F1ECE2]">
              <MiniLabel>Your next step</MiniLabel>
              <CardH>
                {nextCategory.status === "active"
                  ? `Finish the ${nextCategory.label} category`
                  : `Start the ${nextCategory.label} category`}
              </CardH>
              <p className="mb-3.5 text-[14.5px] leading-relaxed text-[#13294B]/80">
                {nextCategory.summary ||
                  "Summit gathers this in conversation rather than as a form — a few minutes now is enough to move it on."}
              </p>
              <Link
                to={ROUTES.SUMMIT.DISCOVERY}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B1B33] px-4 py-2.5 text-sm font-semibold text-[#FBF7F0] hover:bg-[#1D3A66]"
              >
                Continue discovery <ChevronRight className="h-4 w-4" />
              </Link>
            </Card>
          )}

          <Card>
            <div className="mb-3.5 flex items-start justify-between gap-3">
              <div>
                <MiniLabel>Goals surfaced so far · Summit</MiniLabel>
                <CardH>
                  {goals.length === 0
                    ? "No goals yet"
                    : "Goals built on how you think"}
                </CardH>
              </div>
              {goals.length > 2 && (
                <Link to={ROUTES.SUMMIT.GOALS} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E5F6B]">
                  See all {goals.length} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            {goals.length === 0 ? (
              <p className="text-[14px] leading-relaxed text-[#13294B]/80">
                Goals are written out of the discovery conversation rather than typed
                into a form, so they appear here as you talk to Summit — on the right
                of this screen.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {goals.slice(0, 2).map((g) => (
                  <GoalCard key={g.goal_id} g={g} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Callout tone="brain" icon={<Brain className="h-4 w-4 text-[#0E5F6B]" />}>
        Every goal here is aligned to your brain map: we prefer goals that <strong>leverage your natural strengths</strong>, and we frame any stretch as a conscious, time-boxed adaptation — never a permanent rewrite of who you are.
      </Callout>
    </div>
  );
}
