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
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Heart, Brain, Gauge, Users, Target, Info, Loader2, Lock, Mic, Share2,
  ArrowLeft, Check, Pencil, Upload, X,
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
import {
  ALIGN_LABEL,
  ALIGN_STYLES,
  CATEGORY_LABEL,
  alignKind,
  categoryLabel,
  coachLabel,
  goalStatusLabel,
  prismSummary,
  styleLabel,
} from "@/pages/summit/_summit";

/** A message from a failed mutation, as a person can read it. */
function errorText(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  return "That didn't save. Nothing was changed — try again.";
}

/**
 * A session goal (Store A). Every field is optional in the live contract and
 * each is dropped rather than defaulted when absent: a goal synthesised
 * without a behavioural profile has no PRISM alignment, and inventing a
 * neutral-looking pill would claim a reading that was never taken.
 */
export function GoalCard({ g, children }: { g: SummitGoal; children?: React.ReactNode }) {
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
      {children}
    </Card>
  );
}

/** A coach's review, as the member reads it back (Goals offering, Phase 4, D7). */
function ReviewRow({ review }: { review: GoalReview }) {
  const when = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "";
  return (
    <li className="rounded-xl border border-[#F1ECE2] bg-[#FBF7F0] px-3 py-2 text-[12.5px] text-[#13294B]">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-[#0B1B33]">{review.reviewerName || "A coach"}</b>
        <StatusPill
          status={review.ratified ? "confirmed" : "proposed"}
          label={review.ratified ? "Ratified" : "Not ratified"}
        />
        {when && <span className="ml-auto text-[11px] text-[#7C93B5]">{when}</span>}
      </div>
      {review.comment && <p className="mt-1">{review.comment}</p>}
    </li>
  );
}

/** A published goal (Store B) — what a coach would see, with the owner's controls. */
function SharedGoalCard({ goal, reviews = [] }: { goal: SharedGoal; reviews?: GoalReview[] }) {
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
          label={goal.status === "confirmed" ? "Confirmed" : "Provisional"}
        />
      </div>
      {goal.motivation && (
        <div className="mt-2.5 flex gap-2 rounded-xl border-l-[3px] border-[#C88B1B] bg-[#FBF7F0] px-3 py-2.5 text-[13px] leading-snug text-[#13294B]">
          <Heart className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#C88B1B]" />
          <span>
            <b className="text-[#0B1B33]">Why it matters:</b> {goal.motivation}
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
          {goal.source === "member" ? "From your interview" : "Seeded"}
        </span>
      </div>
      {reviews.length > 0 ? (
        <ul className="mt-3 space-y-1.5" aria-label="Coach reviews">
          {reviews.map((r) => (
            <ReviewRow key={r.id} review={r} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12.5px] text-[#13294B]/70">No reviews yet.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[#F1ECE2] pt-3">
        <label className="flex items-center gap-2 text-[12.5px] font-semibold text-[#13294B]">
          <Switch
            checked={isPrivate}
            disabled={pending}
            aria-label={`Keep "${goal.title}" private`}
            onCheckedChange={(checked) =>
              setVisibility.mutate({
                goalId: goal.goalId,
                visibility: checked ? "private" : "shareable",
              })
            }
          />
          <Lock className="h-3.5 w-3.5 text-[#7C93B5]" aria-hidden />
          {isPrivate ? "Private — hidden even from people you share with" : "Shareable"}
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
            Unpublish
          </Button>
        )}
        {pending && <Loader2 className="h-4 w-4 animate-spin text-[#7C93B5]" aria-hidden />}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-[#C2614F]">
          {errorText(error)}
        </p>
      )}
    </Card>
  );
}

/** A session goal not yet published: confirm & publish, or edit the title. */
function DraftCard({ goal }: { goal: SummitGoal }) {
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
      setError(errorText(err));
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
      setError(errorText(err));
    }
  };

  return (
    <GoalCard g={goal}>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#F1ECE2] pt-3">
        {editing ? (
          <form onSubmit={saveTitle} className="flex flex-1 items-center gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Goal title"
              className="h-8"
              maxLength={500}
            />
            <Button type="submit" size="sm" disabled={pending}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
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
              Confirm &amp; publish
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
              Edit
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
  const create = useCreateGoal();
  const publish = usePublishGoal();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<SummitCategoryKey>("job");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const pending = create.isPending || publish.isPending;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setError(null);
    setDone(false);
    try {
      const created = await create.mutateAsync({ title: t, category });
      await publish.mutateAsync(created.goal_id);
      setTitle("");
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <Card className="!p-[19px]">
      <div className="text-[15px] font-bold text-[#0B1B33]">Add a goal</div>
      <p className="mt-1 text-[13px] text-[#13294B]/75">
        The interview writes better goals than a form does, but a goal you already
        know belongs here too. It is published as soon as it is saved.
      </p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What do you want to achieve?"
          aria-label="New goal title"
          maxLength={500}
          className="h-9 flex-1"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as SummitCategoryKey)}
          aria-label="Goal category"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {SUMMIT_CATEGORY_KEYS.map((k) => (
            <option key={k} value={k}>
              {CATEGORY_LABEL[k]}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" className="h-9" disabled={pending || !title.trim()}>
          {pending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="mr-1 h-3.5 w-3.5" aria-hidden />}
          Save &amp; publish
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-[#C2614F]">
          {error}
        </p>
      )}
      {done && !error && (
        <p className="mt-2 text-[12.5px] text-[#5B8A72]">Published. It is in your goals above.</p>
      )}
    </Card>
  );
}

export default function SummitGoals() {
  const [params] = useSearchParams();
  const fromJourney = params.get("journey") === "direction-setting";
  const session = useGoalSession();
  const mine = useMyGoals();
  const myReviews = useMyGoalReviews();

  const shared = mine.data?.goals ?? [];
  const publishedFrom = new Set(shared.map((g) => g.publishedFrom).filter(Boolean));
  const drafts = (session.data?.goals ?? []).filter((g) => !publishedFrom.has(g.goal_id));

  const loading = session.isLoading || mine.isLoading;
  const nothingAnywhere =
    !loading && !session.isError && !mine.isError && shared.length === 0 && drafts.length === 0;

  return (
    <div className="flex flex-col gap-[18px]">
      {fromJourney && (
        <Link
          to={ROUTES.DIRECTION_SETTING.GOALS}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#0E5F6B]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to your journey (step 5)
        </Link>
      )}
      <PageHead
        eyebrow="Yours — private until you share them"
        title="Your goals"
        sub="Goals come out of the interview with the reason underneath them. Confirm a draft to publish it; then choose, person by person, who can see it."
      />
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to={ROUTES.MY_GOALS.INTERVIEW}>
            <Mic className="mr-1 h-3.5 w-3.5" aria-hidden /> Talk it through with Goals Studio
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to={ROUTES.MY_GOALS.SHARING}>
            <Share2 className="mr-1 h-3.5 w-3.5" aria-hidden /> Who can see my goals
          </Link>
        </Button>
      </div>
      <Callout tone="info" icon={<Info className="h-4 w-4 text-[#1D3A66]" />}>
        A goal marked <strong>Requires stretch</strong> isn&apos;t a weakness call — it&apos;s a deliberate, time-boxed move against type.
      </Callout>

      {loading && (
        <div className="flex items-center gap-2 text-[13.5px] text-[#13294B]/70">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Reading your goals…
        </div>
      )}

      {!loading && (session.isError || mine.isError) && (
        <Card className="!p-5">
          <p className="text-[14px] text-[#13294B]/80">
            We couldn&apos;t read your goals just now. Refresh to try again — nothing
            you&apos;ve worked through has been lost.
          </p>
        </Card>
      )}

      {nothingAnywhere && (
        <Card className="!p-5">
          <div className="text-[15px] font-bold text-[#0B1B33]">No goals yet</div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#13294B]/80">
            Goals here are written out of the discovery conversation rather than typed
            into a form. Start the interview and they&apos;ll appear, each with the
            reason underneath it — or add one you already know below.
          </p>
        </Card>
      )}

      {!loading && !mine.isError && shared.length > 0 && (
        <section aria-labelledby="shared-goals-heading" className="flex flex-col gap-3">
          <h2 id="shared-goals-heading" className="text-[13px] font-bold uppercase tracking-wide text-[#7C93B5]">
            Your goals
          </h2>
          {shared.map((g) => (
            <SharedGoalCard
              key={g.goalId}
              goal={g}
              reviews={(myReviews.data?.reviews ?? []).filter((r) => r.goalId === g.goalId)}
            />
          ))}
        </section>
      )}

      {!loading && !session.isError && drafts.length > 0 && (
        <section aria-labelledby="draft-goals-heading" className="flex flex-col gap-3">
          <h2 id="draft-goals-heading" className="text-[13px] font-bold uppercase tracking-wide text-[#7C93B5]">
            Drafts from your interview
          </h2>
          {drafts.map((g) => (
            <DraftCard key={g.goal_id} goal={g} />
          ))}
        </section>
      )}

      {!loading && <QuickAdd />}
    </div>
  );
}
