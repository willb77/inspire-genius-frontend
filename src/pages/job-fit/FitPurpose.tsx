import { Compass, MessagesSquare, Sparkles, Target } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"

/**
 * What Job Fit is for, stated before the first score.
 *
 * A fit percentage with no framing reads as a verdict — and a low one reads as
 * a rejection. It is neither: it is a comparison between a behavioral profile
 * and a role benchmark, and the useful half of the product is what you do next.
 * Saying that up front is the difference between a user who closes the tab and
 * one who opens Coaching.
 *
 * Deliberately pure and self-contained: no hooks, no routing. Every existing
 * Job-Fit page test renders its page bare, and this is rendered by one of them.
 */

const STEPS = [
  {
    icon: Compass,
    id: "blueprint",
  },
  {
    icon: Target,
    id: "fit",
  },
  {
    icon: MessagesSquare,
    id: "act",
  },
] as const

/** Step copy, resolved at render so it follows the active language. */
function stepText(id: (typeof STEPS)[number]["id"], t: TFunction): { title: string; body: string } {
  switch (id) {
    case "blueprint":
      return {
        title: t("fitPurpose.blueprintTitle", "Blueprint a role"),
        body: t(
          "fitPurpose.blueprintBody",
          "Upload a posting or describe one. The Job DNA engine drafts a behavioral blueprint from it — a starting point a person reviews, not a validated PRISM blueprint — and saves the role for reuse.",
        ),
      }
    case "fit":
      return {
        title: t("fitPurpose.fitTitle", "See the fit"),
        body: t(
          "fitPurpose.fitBody",
          "Your PRISM profile against that blueprint, dimension by dimension — where you line up, where you don't, and by how much.",
        ),
      }
    default:
      return {
        title: t("fitPurpose.actTitle", "Do something about it"),
        body: t(
          "fitPurpose.actBody",
          "Coaching turns the growth areas into a conversation: what to close, what to work around, and how to talk about it in an interview.",
        ),
      }
  }
}

export default function FitPurpose() {
  const { t } = useTranslation("jobFitPages")
  return (
    <section className="mb-6 rounded-xl border border-[#e5e7eb] bg-white p-5">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-[#1f2937]">
        <Sparkles className="h-4 w-4 text-[#0D9488]" aria-hidden />
        {t("fitPurpose.heading", "What Job Fit is for")}
      </h2>
      <p className="mb-4 max-w-3xl text-sm text-[#6b7280]">
        {t(
          "fitPurpose.introLead",
          "Job Fit compares how you're wired against what a role actually demands, so you can see the difference and act on it.",
        )}{" "}
        <span className="font-medium text-[#1f2937]">
          {t("fitPurpose.introEmphasis", "A fit score is a comparison, not a verdict")}
        </span>{" "}
        {t(
          "fitPurpose.introTail",
          "— a low one usually means a specific, nameable growth area, and naming it is the point.",
        )}
      </p>
      <ol className="grid gap-4 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, id }, i) => {
          const { title, body } = stepText(id, t)
          return (
          <li key={id} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(13,148,136,0.1)] text-xs font-semibold text-[#0D9488]">
                {i + 1}
              </span>
              <Icon className="h-4 w-4 text-[#0D9488]" aria-hidden />
              <span className="text-sm font-medium text-[#1f2937]">{title}</span>
            </div>
            <p className="text-xs text-[#6b7280]">{body}</p>
          </li>
          )
        })}
      </ol>
    </section>
  )
}
