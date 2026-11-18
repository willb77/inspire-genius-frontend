/**
 * My Goals — the person's own goals (Goals offering, Phase 3).
 *
 * Two lists, deliberately kept apart because they are two stores:
 *
 *   1. **Your goals** — the shared record (`GET /v1/agents/goals/mine`). These
 *      are what a manager or coach sees IF the person has shared with them.
 *      Each carries its status, a private switch (D5) and, from Phase 4, the
 *      coach's review.
 *   2. **Drafts from your interview** — the Summit session (`GET /session`)
 *      goals that have not been published yet. Confirming one publishes it.
 *
 * Nothing on this page reports success it has not had: every button waits for
 * its mutation to settle and shows the error inline when it does not.
 */
import { useId, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  Heart, Brain, Gauge, Users, Target, Info, Loader2, Lock, Mic, Share2,
  ArrowLeft, Check, ChevronDown, Clock, Pencil, Upload, X,
} from "lucide-react";
import { PageHead, Card, Callout, StatusPill } from "@/pages/summit/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { GOAL_CATEGORY_LABEL, GOAL_HORIZON_LABEL } from "@/constants/development";
import { useGoalSession, usePatchGoal } from "@/hooks/summit/useGoalSession";
import {
  useCreateGoal,
  useMyGoalReviews,
  useMyGoals,
  usePublishGoal,
  useSetGoalVisibility,
  useUnpublishGoal,
} from "@/hooks/summit/useMyGoals";
import { SUMMIT_CATEGORY_KEYS, type SharedGoal, type SummitCategoryKey, type SummitGoal } from "@/types/summit";
import type { GoalReview } from "@/types/development";
import type { GoalTargetWithRoadmap } from "@/types/goals/targets";
import { useGoalTargetsEnabled } from "@/hooks/switches/useGoalTargetsEnabled";
import { useMyTargets } from "@/hooks/goals/useGoalTargets";
import { isJobFitGoal } from "@/pages/summit/_targets";
import {
  ALIGN_STYLES,
  alignKind,
  alignLabel,
  categoryLabel,
  coachLabel,
  goalStatusLabel,
  prismSummary,
  styleLabel,
} from "@/pages/summit/_summit";
import { isHouseStyleOn } from "@/lib/house/areaSwitch";

/** A message from a failed mutation, as a person can read it. */
function errorText(err: unknown, t: TFunction): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return t("goals.errorSave", { defaultValue: "That didn't save. Nothing was changed — try again." });
}

/**
 * "Created" stamp for a goal card: the viewer's locale and local timezone,
 * date + time. A goal with no usable timestamp (drafts written before the
 * backend began stamping them) says so rather than showing a guessed date.
 */
function formatCreated(iso: string | null | undefined, locale?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(locale || undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
  } catch {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(d);
  }
}

function CreatedStamp({ iso }: { iso: string | null | undefined }) {
  const { t, i18n } = useTranslation("summitPages");
  const when = formatCreated(iso, i18n.language);
  return (
    <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-[#7C93B5]">
      <Clock className="h-3 w-3" aria-hidden />
      {when
        ? t("goals.created", { defaultValue: "Created: {{when}}", when })
        : t("goals.createdNotRecorded", { defaultValue: "Created: not recorded" })}
    </p>
  );
}

/**
 * A session goal (Store A). Every field is optional in the live contract and
 * each is dropped rather than defaulted when absent: a goal synthesised
 * without a behavioural profile has no PRISM alignment, and inventing a
 * neutral-looking pill would claim a reading that was never taken.
 */
export function GoalCard({ g, children }: { g: SummitGoal; children?: React.ReactNode }) {
  const { t } = useTranslation("summitPages");
  const cat = categoryLabel(g.category, t);
  const align = alignKind(g.prism_alignment);
  const prism = prismSummary(g.prism_alignment);
  const style = styleLabel(g.execution_style, t);
  const coach = coachLabel(g.owning_coach, t);

  return (
    <Card className="!p-[19px]">
      {cat && (
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#0E5F6B]">{cat}</div>
      )}
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <div className="text-base font-bold leading-snug text-[#0B1B33]">{g.title}</div>
        <StatusPill status={g.status} label={goalStatusLabel(g.status, t)} />
      </div>
      {g.motivation && (
        <div className="mt-2.5 flex gap-2 rounded-xl border-l-[3px] border-[#C88B1B] bg-[#FBF7F0] px-3 py-2.5 text-[13px] leading-snug text-[#13294B]">
          <Heart className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#C88B1B]" />
          <span>
            <b className="text-[#0B1B33]">{t("goals.whyItMatters", { defaultValue: "Why it matters:" })}</b> {g.motivation}
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
            {alignLabel(align, t)}
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
            <b>{t("goals.success", { defaultValue: "Success:" })}</b> {g.success_metric}
          </span>
        </div>
      )}
      {g.first_step && (
        <div className="mt-1.5 text-[12.5px] text-[#13294B]/85">
          <b>{t("goals.firstStep", { defaultValue: "First step:" })}</b> {g.first_step}
        </div>
      )}
      {children}
    </Card>
  );
}

/** A coach's review, as the member reads it back (Goals offering, Phase 4, D7). */
function ReviewRow({ review }: { review: GoalReview }) {
  const { t } = useTranslation("summitPages");
  const when = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "";
  return (
    <li className="rounded-xl border border-[#F1ECE2] bg-[#FBF7F0] px-3 py-2 text-[12.5px] text-[#13294B]">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-[#0B1B33]">{review.reviewerName || t("goals.aCoach", { defaultValue: "A coach" })}</b>
        <StatusPill
          status={review.ratified ? "confirmed" : "proposed"}
          label={review.ratified ? t("goals.ratified", { defaultValue: "Ratified" }) : t("goals.notRatified", { defaultValue: "Not ratified" })}
        />
        {when && <span className="ml-auto text-[11px] text-[#7C93B5]">{when}</span>}
      </div>
      {review.comment && <p className="mt-1">{review.comment}</p>}
    </li>
  );
}

/** A published goal (Store B) — what a coach would see, with the owner's controls. */
function SharedGoalCard({
  goal,
  reviews = [],
  target,
}: {
  goal: SharedGoal;
  reviews?: GoalReview[];
  /** Feeds Phase 3 — present only while the goal_targets switch is on. */
  target?: GoalTargetWithRoadmap;
}) {
  const { t } = useTranslation("summitPages");
  const setVisibility = useSetGoalVisibility();
  const unpublish = useUnpublishGoal();
  const isPrivate = goal.visibility === "private";
  const pending = setVisibility.isPending || unpublish.isPending;
  const error = setVisibility.error ?? unpublish.error;

  return (
    <Card className="!p-[19px]">
      <div className="text-[11px] font-bold uppercase tracking-wide text-[#0E5F6B]">
        {GOAL_CATEGORY_LABEL[goal.category] ?? goal.category}
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <div className="text-base font-bold leading-snug text-[#0B1B33]">{goal.title}</div>
        <StatusPill
          status={goal.status}
          label={goal.status === "confirmed" ? t("goals.confirmed", { defaultValue: "Confirmed" }) : t("goals.provisional", { defaultValue: "Provisional" })}
        />
      </div>
      {goal.motivation && (
        <div className="mt-2.5 flex gap-2 rounded-xl border-l-[3px] border-[#C88B1B] bg-[#FBF7F0] px-3 py-2.5 text-[13px] leading-snug text-[#13294B]">
          <Heart className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#C88B1B]" />
          <span>
            <b className="text-[#0B1B33]">{t("goals.whyItMatters", { defaultValue: "Why it matters:" })}</b> {goal.motivation}
          </span>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-[11.5px] font-semibold">
        <span className="rounded-lg bg-[#F1ECE2] px-2.5 py-1.5 text-[#13294B]">
          {GOAL_HORIZON_LABEL[goal.horizon] ?? goal.horizon}
        </span>
        {goal.ownerCoach && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1B33] px-2.5 py-1.5 text-[#FBF7F0]">
            <Users className="h-3 w-3" /> {goal.ownerCoach}
          </span>
        )}
        <span className="rounded-lg bg-[#127A8A]/13 px-2.5 py-1.5 text-[#0E5F6B]">
          {isJobFitGoal(goal.publishedFrom)
            ? t("goals.fromJobFit", { defaultValue: "From Job Fit" })
            : goal.source === "member" ? t("goals.fromInterview", { defaultValue: "From your interview" }) : t("goals.seeded", { defaultValue: "Seeded" })}
        </span>
      </div>
      {target && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px] text-[#13294B]">
          <Target className="h-3.5 w-3.5 text-[#0E5F6B]" aria-hidden />
          <span>
            {t("goals.targets", { defaultValue: "Targets" })} <b>{target.roleTitle || t("goals.aRole", { defaultValue: "a role" })}</b>
          </span>
          <Link
            to={ROUTES.MY_GOALS.ROADMAP(goal.goalId)}
            className="font-semibold text-[#0E5F6B] underline"
          >
            {t("goals.viewRoadmap", { defaultValue: "View roadmap" })}
          </Link>
        </div>
      )}
      <CreatedStamp iso={goal.createdAt} />
      {reviews.length > 0 ? (
        <ul className="mt-3 space-y-1.5" aria-label={t("goals.coachReviews", { defaultValue: "Coach reviews" })}>
          {reviews.map((r) => (
            <ReviewRow key={r.id} review={r} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12.5px] text-[#13294B]/70">{t("goals.noReviews", { defaultValue: "No reviews yet." })}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[#F1ECE2] pt-3">
        <label className="flex items-center gap-2 text-[12.5px] font-semibold text-[#13294B]">
          <Switch
            checked={isPrivate}
            disabled={pending}
            aria-label={t("goals.keepPrivate", { defaultValue: "Keep \"{{title}}\" private", title: goal.title })}
            onCheckedChange={(checked) =>
              setVisibility.mutate({
                goalId: goal.goalId,
                visibility: checked ? "private" : "shareable",
              })
            }
          />
          <Lock className="h-3.5 w-3.5 text-[#7C93B5]" aria-hidden />
          {isPrivate ? t("goals.private", { defaultValue: "Private — hidden even from people you share with" }) : t("goals.shareable", { defaultValue: "Shareable" })}
        </label>
        {goal.publishedFrom && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => unpublish.mutate(goal.publishedFrom as string)}
          >
            <X className="mr-1 h-3.5 w-3.5" aria-hidden />
            {t("goals.unpublish", { defaultValue: "Unpublish" })}
          </Button>
        )}
        {pending && <Loader2 className="h-4 w-4 animate-spin text-[#7C93B5]" aria-hidden />}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-[#C2614F]">
          {errorText(error, t)}
        </p>
      )}
    </Card>
  );
}

/** A session goal not yet published: confirm & publish, or edit the title. */
function DraftCard({ goal }: { goal: SummitGoal }) {
  const { t } = useTranslation("summitPages");
  const patch = usePatchGoal();
  const publish = usePublishGoal();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [error, setError] = useState<string | null>(null);
  const pending = patch.isPending || publish.isPending;

  const confirmAndPublish = async () => {
    setError(null);
    try {
      if (goal.status !== "confirmed") {
        await patch.mutateAsync({ goalId: goal.goal_id, body: { status: "confirmed" } });
      }
      await publish.mutateAsync(goal.goal_id);
    } catch (err) {
      setError(errorText(err, t));
    }
  };

  const saveTitle = async (e: FormEvent) => {
    e.preventDefault();
    const next = title.trim();
    if (!next || next === goal.title) {
      setEditing(false);
      return;
    }
    setError(null);
    try {
      await patch.mutateAsync({ goalId: goal.goal_id, body: { title: next } });
      setEditing(false);
    } catch (err) {
      setError(errorText(err, t));
    }
  };

  return (
    <GoalCard g={goal}>
      <CreatedStamp iso={goal.created_at} />
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#F1ECE2] pt-3">
        {editing ? (
          <form onSubmit={saveTitle} className="flex flex-1 items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label={t("goals.goalTitle", { defaultValue: "Goal title" })}
              className="h-8"
              maxLength={500}
            />
            <Button type="submit" size="sm" disabled={pending}>
              {t("goals.save", { defaultValue: "Save" })}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t("goals.cancel", { defaultValue: "Cancel" })}
            </Button>
          </form>
        ) : (
          <>
            <Button type="button" size="sm" disabled={pending} onClick={confirmAndPublish}>
              {pending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Upload className="mr-1 h-3.5 w-3.5" aria-hidden />
              )}
              {t("goals.confirmPublish", { defaultValue: "Confirm & publish" })}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
              {t("goals.edit", { defaultValue: "Edit" })}
            </Button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-[#C2614F]">
          {error}
        </p>
      )}
    </GoalCard>
  );
}

/** Title + category → a session goal, then published in the same action. */
function QuickAdd() {
  const { t } = useTranslation("summitPages");
  const create = useCreateGoal();
  const publish = usePublishGoal();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<SummitCategoryKey>("job");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const pending = create.isPending || publish.isPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setError(null);
    setDone(false);
    try {
      const created = await create.mutateAsync({ title: trimmed, category });
      await publish.mutateAsync(created.goal_id);
      setTitle("");
      setDone(true);
    } catch (err) {
      setError(errorText(err, t));
    }
  };

  return (
    <Card className="!p-[19px]">
      <div className="text-[15px] font-bold text-[#0B1B33]">{t("goals.addGoal", { defaultValue: "Add a goal" })}</div>
      <p className="mt-1 text-[13px] text-[#13294B]/75">
        {t("goals.addGoalBody", { defaultValue: "The interview writes better goals than a form does, but a goal you already know belongs here too. It is published as soon as it is saved." })}
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("goals.placeholder", { defaultValue: "What do you want to achieve?" })}
          aria-label={t("goals.newGoalTitle", { defaultValue: "New goal title" })}
          maxLength={500}
          className="h-9 flex-1"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SummitCategoryKey)}
          aria-label={t("goals.goalCategory", { defaultValue: "Goal category" })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {SUMMIT_CATEGORY_KEYS.map((k) => (
            <option key={k} value={k}>
              {categoryLabel(k, t)}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" className="h-9" disabled={pending || !title.trim()}>
          {pending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="mr-1 h-3.5 w-3.5" aria-hidden />}
          {t("goals.savePublish", { defaultValue: "Save & publish" })}
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-[#C2614F]">
          {error}
        </p>
      )}
      {done && !error && (
        <p className="mt-2 text-[12.5px] text-[#5B8A72]">{t("goals.published", { defaultValue: "Published. It is in your goals above." })}</p>
      )}
    </Card>
  );
}

/** A collapsed-by-default list behind a pill: a real button, count shown. */
function GoalPill({
  label,
  count,
  headingId,
  children,
}: {
  label: string;
  count: number;
  headingId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="flex flex-col gap-3">
      <h2 id={headingId} className="text-[13px] font-bold">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-2 rounded-full border border-[#127A8A]/40 bg-white px-4 py-2 text-[13px] font-bold text-[#0B1B33] hover:bg-[#FBF7F0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#127A8A] focus-visible:ring-offset-2"
        >
          {label}
          <span className="rounded-full bg-[#127A8A]/15 px-2 py-0.5 text-[11.5px] text-[#0E5F6B]">{count}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </h2>
      <section id={panelId} aria-labelledby={headingId} hidden={!open} className="flex flex-col gap-3">
        {children}
      </section>
    </div>
  );
}

export default function SummitGoals() {
  const { t } = useTranslation("summitPages");
  const [params] = useSearchParams();
  const fromJourney = params.get("journey") === "direction-setting";
  const session = useGoalSession();
  const mine = useMyGoals();
  const myReviews = useMyGoalReviews();

  const shared = mine.data?.goals ?? [];
  const publishedFrom = new Set(shared.map((g) => g.publishedFrom).filter(Boolean));
  const targetsOn = useGoalTargetsEnabled();
  const targets = useMyTargets(targetsOn);
  const targetByGoal = new Map((targets.data ?? []).map((tg) => [tg.goalId, tg]));
  const drafts = (session.data?.goals ?? []).filter((g) => !publishedFrom.has(g.goal_id));

  const loading = session.isLoading || mine.isLoading;
  // House style (goals, S2a), display only: explain "Requires stretch" only
  // when a goal on this page actually carries that label. OFF: always shown.
  const showStretchCallout = isHouseStyleOn("goals")
    ? !loading && !session.isError && drafts.some((g) => alignKind(g.prism_alignment) === "stretch")
    : true;
  const nothingAnywhere =
    !loading && !session.isError && !mine.isError && shared.length === 0 && drafts.length === 0;

  return (
    <div className="flex flex-col gap-[18px]">
      {fromJourney && (
        <Link
          to={ROUTES.DIRECTION_SETTING.GOALS}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E5F6B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> {t("goals.backJourney", { defaultValue: "Back to your journey (step 5)" })}
        </Link>
      )}
      <PageHead
        eyebrow={t("goals.eyebrow", { defaultValue: "Yours — private until you share them" })}
        title={t("goals.title", { defaultValue: "Your goals" })}
        sub={t("goals.sub", { defaultValue: "Goals come out of the interview with the reason underneath them. Confirm a draft to publish it; then choose, person by person, who can see it." })}
      />
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to={ROUTES.MY_GOALS.INTERVIEW}>
            <Mic className="mr-1 h-3.5 w-3.5" aria-hidden /> {t("goals.talkStudio", { defaultValue: "Talk it through with Goals Studio" })}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to={ROUTES.MY_GOALS.SHARING}>
            <Share2 className="mr-1 h-3.5 w-3.5" aria-hidden /> {t("goals.whoCanSee", { defaultValue: "Who can see my goals" })}
          </Link>
        </Button>
      </div>
      {showStretchCallout && (
      <Callout tone="info" icon={<Info className="h-4 w-4 text-[#1D3A66]" />}>
        <Trans i18nKey="goals.stretchCallout" ns="summitPages" components={{ strong: <strong /> }}>
          A goal marked <strong>Requires stretch</strong> isn&apos;t a weakness call — it&apos;s a deliberate, time-boxed move against type.
        </Trans>
      </Callout>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-[13.5px] text-[#13294B]/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("goals.loading", { defaultValue: "Reading your goals…" })}
        </div>
      )}

      {!loading && (session.isError || mine.isError) && (
        <Card className="!p-5">
          <p className="text-[14px] text-[#13294B]/80">
            {t("goals.error", { defaultValue: "We couldn't read your goals just now. Refresh to try again — nothing you've worked through has been lost." })}
          </p>
        </Card>
      )}

      {nothingAnywhere && (
        <Card className="!p-5">
          <div className="text-[15px] font-bold text-[#0B1B33]">{t("goals.noGoals", { defaultValue: "No goals yet" })}</div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#13294B]/80">
            {t("goals.noGoalsBody", { defaultValue: "Goals here are written out of the discovery conversation rather than typed into a form. Start the interview and they'll appear, each with the reason underneath it — or add one you already know below." })}
          </p>
        </Card>
      )}

      {!loading && !mine.isError && shared.length > 0 && (
        <GoalPill
          label={t("goals.pillGoalList", { defaultValue: "Your Goal list" })}
          count={shared.length}
          headingId="shared-goals-heading"
        >
          {shared.map((g) => (
            <SharedGoalCard
              key={g.goalId}
              goal={g}
              reviews={(myReviews.data?.reviews ?? []).filter((r) => r.goalId === g.goalId)}
              target={targetsOn ? targetByGoal.get(g.goalId) : undefined}
            />
          ))}
        </GoalPill>
      )}

      {!loading && !session.isError && drafts.length > 0 && (
        <GoalPill
          label={t("goals.draftsHeading", { defaultValue: "Drafts from your interview" })}
          count={drafts.length}
          headingId="draft-goals-heading"
        >
          {drafts.map((g) => (
            <DraftCard key={g.goal_id} goal={g} />
          ))}
        </GoalPill>
      )}

      {!loading && <QuickAdd />}
    </div>
  );
}
