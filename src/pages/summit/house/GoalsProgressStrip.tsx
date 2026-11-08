/**
 * House style, goals area (S2b) — the progress strip above "Talk it through".
 *
 * With the switch on, Overview and Discovery fold into the interview tab, so
 * this strip is where a person sees how far they have got. It reads the SAME
 * session query those pages read (`useGoalSession`, one `GET /session`, shared
 * cache), so it adds no server call and cannot disagree with them.
 *
 * The failure this is written against: a person who has explored areas must
 * never see what reads as a fresh start. So a failed read says it failed (and
 * that nothing is lost) rather than showing zero, and "not started yet" is
 * only said when the read succeeded and nothing has moved.
 */
import { Link } from "react-router-dom";
import { Check, Circle, CircleDot } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { PageState } from "@/components/shared/house/PageState";
import { cn } from "@/lib/utils";
import { useGoalSession, useSummitCategories } from "@/hooks/summit/useGoalSession";

const STATUS_WORD = {
  explored: "Done",
  active: "In progress",
  todo: "Not started",
} as const;

export default function GoalsProgressStrip() {
  const { data: session, isLoading, isError, refetch } = useGoalSession();
  const categories = useSummitCategories(session);

  if (isLoading) return <PageState kind="loading" rows={1} />;

  // A failed BACKGROUND refetch (the interview re-reads the session after each
  // turn) keeps the last good read on screen; only a read with nothing to show
  // becomes the error state.
  if (isError && !session) {
    return (
      <PageState
        kind="error"
        className="py-6"
        message="We couldn't read your progress just now. Nothing you've worked through has been lost."
        onRetry={() => void refetch()}
      />
    );
  }

  if (categories.length === 0) return null;

  const explored = categories.filter((c) => c.status === "explored").length;
  const goals = session?.goals?.length ?? 0;
  const started = explored > 0 || goals > 0 || categories.some((c) => c.status === "active");
  const next = categories.find((c) => c.status !== "explored");

  let line: string;
  if (!started) line = `You haven't started yet. The conversation below begins with ${categories[0].label}.`;
  else if (!next) line = "Every area is explored.";
  else if (next.status === "active") line = `Carrying on with ${next.label}.`;
  else line = `Next up: ${next.label}.`;

  return (
    <section
      aria-label="Your progress"
      className="rounded-lg border border-border bg-card p-4"
      data-testid="goals-progress-strip"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {explored} of {categories.length} areas explored
        </p>
        {goals > 0 && (
          <Link to={ROUTES.MY_GOALS.BASE} className="text-sm font-medium text-primary hover:underline">
            {goals} goal{goals === 1 ? "" : "s"} drafted · see My goals
          </Link>
        )}
      </div>
      <ol className="flex flex-wrap gap-1.5">
        {categories.map((c) => {
          const Icon = c.status === "explored" ? Check : c.status === "active" ? CircleDot : Circle;
          return (
            <li
              key={c.key}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
                c.status === "explored" && "border-primary/40 bg-primary/10 text-foreground",
                c.status === "active" && "border-primary font-medium text-foreground",
                c.status === "todo" && "border-border text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {c.label}
              <span className="sr-only">: {STATUS_WORD[c.status]}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm text-muted-foreground">{line}</p>
    </section>
  );
}
