import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { PageState } from "@/components/shared/house/PageState"
import { ROUTES } from "@/constants/routes"
import { formatDate } from "@/lib/house/formatDate"
import { useLiveSessions } from "@/hooks/interview/useLiveSessions"
import type { LiveSessionSummary } from "@/services/interview/live.service"
import { kindLabel, openHref } from "./interviewHouseRoutes"
import type { TFn } from "@/components/interview/tFallback"

/**
 * House style (interview area): the manager's interview list, where every row
 * opens.
 *
 * Same data call as the classic page (`useLiveSessions({ limit: 100 })`) and
 * the same score figure. What changes is that each row links to the page that
 * already knows how to open a stored session by id: a hiring interview opens
 * in Live Interview, an own-questions or development one in Interview Studio.
 * A finished interview opens read-only there; an unfinished one continues.
 * Neither page re-scores a finished interview.
 */

const fmtScore = (v: number | null | undefined, t: TFn) =>
  typeof v === "number" && Number.isFinite(v)
    ? t("house.list.scoreOfFive", { defaultValue: "{{score}} / 5", score: v.toFixed(2) })
    : "—"

const candidateLabel = (s: LiveSessionSummary, t: TFn) =>
  s.candidate_ref?.display_name?.trim() ||
  (s.candidate_ref?.candidate_hash ? t("house.list.nameNotRecorded", "Name not recorded") : "—")

function resultLabel(s: LiveSessionSummary, t: TFn): string {
  if (s.status === "finalized") return fmtScore(s.overall_score, t)
  if (s.status === "in_progress") return t("house.list.notFinished", "Not finished")
  if (s.status === "abandoned") return t("house.list.stopped", "Stopped")
  return "—"
}

function SessionTable({ rows, caption }: { rows: LiveSessionSummary[]; caption: string }) {
  const { t } = useTranslation("interviewPages")
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-3 py-2 font-medium">{t("house.list.date", "Date")}</th>
            <th className="px-3 py-2 font-medium">{t("house.list.candidate", "Candidate")}</th>
            <th className="px-3 py-2 font-medium">{t("house.list.role", "Role")}</th>
            <th className="px-3 py-2 font-medium">{t("house.list.kind", "Kind")}</th>
            <th className="px-3 py-2 font-medium">{t("house.list.result", "Result")}</th>
            <th className="px-3 py-2 font-medium">
              <span className="sr-only">{t("house.list.open", "Open")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 text-foreground">{formatDate(s.finalized_at ?? s.created_at)}</td>
              <td className="px-3 py-2 text-foreground">{candidateLabel(s, t)}</td>
              <td className="px-3 py-2 text-muted-foreground">{s.frame?.roleTitle || "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{kindLabel(s, t)}</td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{resultLabel(s, t)}</td>
              <td className="px-3 py-2 text-right">
                <Button asChild size="sm" variant="outline">
                  <Link to={openHref(s)} aria-label={t("house.list.openAria", { defaultValue: "Open the interview with {{name}}", name: candidateLabel(s, t) })}>
                    {s.status === "in_progress" ? t("house.list.continue", "Continue") : t("house.list.open", "Open")}
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function InterviewsListHouse() {
  const { t } = useTranslation("interviewPages")
  const { data, isLoading, error, refetch } = useLiveSessions({ limit: 100 })

  const sessions = useMemo(() => data?.sessions ?? [], [data])
  const inProgress = useMemo(() => sessions.filter((s) => s.status === "in_progress"), [sessions])
  const past = useMemo(() => sessions.filter((s) => s.status !== "in_progress"), [sessions])

  const newInterview = (
    <Button asChild>
      <Link to={ROUTES.MANAGER.INTERVIEW_STUDIO}>{t("house.list.newInterview", "New interview")}</Link>
    </Button>
  )

  return (
    <div>
      <PageHeader
        title={t("house.list.title", "Interviews")}
        description={t("house.list.description", "Run a scored interview, or look back at one.")}
        action={newInterview}
      />
      <p className="-mt-4 mb-6 text-sm">
        <Link to={ROUTES.MANAGER.INTERVIEW_PREP} className="text-primary underline-offset-4 hover:underline">
          {t("house.links.prepare", "Prepare questions")}
        </Link>
      </p>

      {isLoading ? (
        <PageState kind="loading" />
      ) : error ? (
        <PageState
          kind="error"
          message={t("house.list.loadFailed", "We couldn't load your interviews.")}
          onRetry={() => void refetch()}
        />
      ) : sessions.length === 0 ? (
        <PageState
          kind="empty"
          title={t("house.list.emptyTitle", "No interviews yet")}
          message={t("house.list.emptyMessage", "Interviews you run appear here, including ones you haven't finished.")}
          action={newInterview}
        />
      ) : (
        <div className="space-y-6">
          {inProgress.length > 0 && (
            <section>
              <h2 className="mb-2 text-base font-semibold text-foreground">
                {t("house.list.inProgress", { defaultValue: "In progress ({{count}})", count: inProgress.length })}
              </h2>
              <SessionTable rows={inProgress} caption={t("house.list.inProgressCaption", "Interviews in progress")} />
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-2 text-base font-semibold text-foreground">
                {t("house.list.past", { defaultValue: "Past interviews ({{count}})", count: past.length })}
              </h2>
              <SessionTable rows={past} caption={t("house.list.pastCaption", "Past interviews")} />
            </section>
          )}
        </div>
      )}

      {data && !data.org_scope_applied && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("house.list.orgNote", "This list shows interviews you ran. It does not include your colleagues' interviews.")}
        </p>
      )}
    </div>
  )
}
