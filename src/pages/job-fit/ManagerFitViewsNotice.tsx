import { Eye } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useManagerFitViews } from "@/hooks/job-fit/useManagerFitViews"
import { withPrism } from "@/lib/withPrism"

function when(ts: string, locale: string): string | null {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" })
}

/**
 * TS-4b — tells the person when a manager or coach they share with scored
 * their fit against a role on demand.
 *
 * Draws nothing when there is nothing to tell (the normal case), or while the
 * read is in flight. A read that FAILED is said as such: silence there would
 * read as "nobody looked". Each line names the role and the day, picked BY
 * NAME from the row; no score and no verdict is shown here (the person's own
 * matches below carry their own reading of the same role).
 */
export function ManagerFitViewsNotice() {
  const { t, i18n } = useTranslation("jobFitPages")
  const { data, isLoading, isError } = useManagerFitViews()

  if (isLoading) return null

  if (isError) {
    return (
      <p role="alert" data-manager-fit-views="error" className="mb-5 text-xs text-[#6b7280]">
        {t(
          "managerFitViews.error",
          "We could not check whether a manager or coach has viewed your fit for a role. Please try again in a moment.",
        )}
      </p>
    )
  }

  const rows = data ?? []
  if (rows.length === 0) return null

  return (
    <section
      data-manager-fit-views="ok"
      aria-label={t("managerFitViews.title", "Who viewed your fit")}
      className="mb-5 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-4 text-sm text-[#374151]"
    >
      <h2 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
        <Eye className="size-4 shrink-0" aria-hidden="true" />
        {t("managerFitViews.title", "Who viewed your fit")}
      </h2>
      <p className="mb-2 text-xs text-[#6b7280]">
        {withPrism(
          t(
            "managerFitViews.intro",
            "A manager or coach you share your PRISM profile and Development with can score your fit for a role. They see the match score only. It is not added to your fit reports.",
          ),
        )}
      </p>
      <ul className="flex flex-col gap-1">
        {rows.map((row, i) => {
          const date = when(row.viewedAt, i18n.language)
          return (
            <li key={`${row.jobId}-${row.viewedAt}-${i}`}>
              {date
                ? t("managerFitViews.line", {
                    defaultValue: "Your manager or coach viewed your fit for {{role}} on {{date}}.",
                    role: row.roleTitle,
                    date,
                  })
                : t("managerFitViews.lineNoDate", {
                    defaultValue: "Your manager or coach viewed your fit for {{role}}.",
                    role: row.roleTitle,
                  })}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
