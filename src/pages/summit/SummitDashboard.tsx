import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Check, Layers, ChevronRight, ArrowRight, Brain, Loader2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { PageHead, Card, MiniLabel, CardH, Callout } from "@/pages/summit/components/ui";
import { GoalCard } from "@/pages/summit/SummitGoals";
import { useAuth } from "@/context/useAuth";
import { useGoalSession, useSummitCategories } from "@/hooks/summit/useGoalSession";
import { GoalsWiringCard } from "@/pages/summit/components/GoalsWiringCard";
import { alignKind } from "@/pages/summit/_summit";
import { isHouseStyleOn } from "@/lib/house/areaSwitch";

/** First name only, for the greeting. Falls back to a name-free headline. */
function firstName(name: string | null | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

export default function SummitDashboard() {
  const { t } = useTranslation("summitPages");
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

  // House style (goals, S2a). Display only — the switch decides which words
  // and links show, never what is read or saved. OFF renders today's page.
  //  - Discovery is read-only and cannot start the conversation, so with the
  //    switch on every "carry on" link goes to the page that can: Interview.
  //  - The brain-map callout shows only when it is true: there are goals and
  //    every one of them carries a PRISM alignment.
  const house = isHouseStyleOn("goals");
  const continueTo = house ? ROUTES.MY_GOALS.INTERVIEW : ROUTES.MY_GOALS.DISCOVERY;
  const everyGoalAligned =
    goals.length > 0 && goals.every((g) => alignKind(g.prism_alignment) !== null);
  const showBrainCallout = house ? !isLoading && !isError && everyGoalAligned : true;

  return (
    <div className="flex flex-col gap-[18px]">
      <PageHead
        eyebrow={t("dashboard.eyebrow", { defaultValue: "Your goal-setting journey" })}
        title={
          who
            ? t("dashboard.titleNamed", { defaultValue: "Let's turn the conversation into goals, {{name}}.", name: who })
            : t("dashboard.title", { defaultValue: "Let's turn the conversation into goals." })
        }
        sub={t("dashboard.sub", { defaultValue: "Goals Studio works through five areas of your life, asks why until it reaches something you actually care about, and turns that into goals with the reason still attached." })}
      />

      {isLoading && (
        <div className="flex items-center gap-2 text-[13.5px] text-[#13294B]/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("dashboard.loading", { defaultValue: "Reading where you've got to…" })}
        </div>
      )}

      {!isLoading && isError && (
        <Card className="!p-5">
          <p className="text-[14px] text-[#13294B]/80">
            {t("dashboard.error", { defaultValue: "We couldn't read your goal-setting session just now. Refresh to try again — nothing you've worked through has been lost." })}
          </p>
        </Card>
      )}

      {!isLoading && !isError && (
        <>
          <Card className="!p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <MiniLabel>
                  {t("dashboard.discoveryProgress", { defaultValue: "Discovery progress · {{explored}} of {{total}} categories", explored, total: categories.length })}
                </MiniLabel>
                <div className="font-serif text-2xl text-[#0B1B33]">{t("dashboard.pctExplored", { defaultValue: "{{pct}}% explored", pct })}</div>
              </div>
              <Link
                to={continueTo}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#127A8A] px-3.5 py-2 text-[13px] font-bold text-white hover:bg-[#0E5F6B]"
              >
                {explored === 0 ? t("dashboard.start", { defaultValue: "Start" }) : t("dashboard.resume", { defaultValue: "Resume" })} <ArrowRight className="h-3.5 w-3.5" />
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
                      <div className="text-[10px] font-bold text-[#7C93B5]">{t("dashboard.categoryN", { defaultValue: "Category {{n}}", n: c.n })}</div>
                      <div className={`text-[11px] leading-tight ${active ? "font-semibold text-[#0B1B33]" : "text-[#13294B]"}`}>{c.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {nextCategory && (
            <Card className="relative overflow-hidden bg-gradient-to-br from-white to-[#F1ECE2]">
              <MiniLabel>{t("dashboard.nextStep", { defaultValue: "Your next step" })}</MiniLabel>
              <CardH>
                {nextCategory.status === "active"
                  ? t("dashboard.finishCategory", { defaultValue: "Finish the {{label}} category", label: nextCategory.label })
                  : t("dashboard.startCategory", { defaultValue: "Start the {{label}} category", label: nextCategory.label })}
              </CardH>
              <p className="mb-3.5 text-[14.5px] leading-relaxed text-[#13294B]/80">
                {nextCategory.summary ||
                  t("dashboard.summaryFallback", { defaultValue: "Goals Studio gathers this in conversation rather than as a form — a few minutes now is enough to move it on." })}
              </p>
              <Link
                to={continueTo}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B1B33] px-4 py-2.5 text-sm font-semibold text-[#FBF7F0] hover:bg-[#1D3A66]"
              >
                {house ? t("dashboard.talkIt", { defaultValue: "Talk it through" }) : t("dashboard.continueDiscovery", { defaultValue: "Continue discovery" })} <ChevronRight className="h-4 w-4" />
              </Link>
            </Card>
          )}

          <Card>
            <div className="mb-3.5 flex items-start justify-between gap-3">
              <div>
                <MiniLabel>{t("dashboard.surfaced", { defaultValue: "Goals surfaced so far · Goals Studio" })}</MiniLabel>
                <CardH>
                  {goals.length === 0
                    ? t("dashboard.noGoals", { defaultValue: "No goals yet" })
                    : t("dashboard.goalsBuilt", { defaultValue: "Goals built on how you think" })}
                </CardH>
              </div>
              {goals.length > 2 && (
                <Link to={ROUTES.MY_GOALS.BASE} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E5F6B]">
                  {t("dashboard.seeAll", { defaultValue: "See all {{count}}", count: goals.length })} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
            {goals.length === 0 && house ? (
              <p className="text-[14px] leading-relaxed text-[#13294B]/80">
                {t("dashboard.houseEmpty", { defaultValue: "Goals are written out of the conversation rather than typed into a form, so they appear here as you talk it through." })}{" "}
                <Link
                  to={ROUTES.MY_GOALS.INTERVIEW}
                  className="inline-flex items-center gap-1 font-semibold text-[#0E5F6B]"
                >
                  {t("dashboard.talkIt", { defaultValue: "Talk it through" })} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </p>
            ) : goals.length === 0 ? (
              <p className="text-[14px] leading-relaxed text-[#13294B]/80">
                {t("dashboard.emptyDiscovery", { defaultValue: "Goals are written out of the discovery conversation rather than typed into a form, so they appear here as you talk to Goals Studio — on the right of this screen." })}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {goals.slice(0, 2).map((g) => (
                  <GoalCard key={g.goal_id} g={g} />
                ))}
              </div>
            )}
          </Card>

          <GoalsWiringCard />
        </>
      )}

      {showBrainCallout && (
      <Callout tone="brain" icon={<Brain className="h-4 w-4 text-[#0E5F6B]" />}>
        <Trans i18nKey="dashboard.brainCallout" ns="summitPages" components={{ strong: <strong /> }}>
          Every goal here is aligned to your brain map: we prefer goals that <strong>leverage your natural strengths</strong>, and we frame any stretch as a conscious, time-boxed adaptation — never a permanent rewrite of who you are.
        </Trans>
      </Callout>
      )}
    </div>
  );
}
