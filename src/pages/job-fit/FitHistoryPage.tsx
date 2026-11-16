import { Link, useParams } from "react-router-dom"
import { ArrowLeft, History } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ROUTES } from "@/constants/routes"
import { useFitSnapshot } from "@/hooks/job-fit/useFitHistory"
import { useFitSharedDisplayEnabled } from "@/hooks/switches/useFitSharedDisplayEnabled"
import type { FitDetail, FitMatch, FitSnapshot } from "@/types/job-fit"
import { FitPageHeader, FitCard, FitEmptyState, FitError, FitLoading, FitPill, FitSectionTitle } from "@/components/fit/primitives"
import { fitPercentTone } from "@/components/fit/fit"
import { FitMatchList } from "@/components/fit/FitMatchList"
import { FitResult } from "@/components/fit/FitResult"
import { FitBreakdown } from "./FitBreakdown"

function isFitDetail(p: FitSnapshot["payload"]): p is FitDetail {
  return Boolean(p) && !Array.isArray(p) && Array.isArray((p as FitDetail).perDimension)
}

function isMatchList(p: FitSnapshot["payload"]): p is FitMatch[] {
  return Array.isArray(p)
}

/**
 * One fit report reopened as it was served (JS-3): a role or pasted-JD
 * breakdown renders the same block the live pages use; a matches snapshot
 * lists the roles as ranked that day; a legacy save shows what it kept. The
 * engine version and date say what produced it — a report is a record of a
 * read, never a verdict.
 */
export default function FitHistoryPage() {
  const { t } = useTranslation("jobFitPages")
  const { snapshotId } = useParams<{ snapshotId: string }>()
  const snap = useFitSnapshot(snapshotId)
  // FIT-5b (decision 5): PRISM fit only, labelled "as recorded", with the
  // partial-profile note. Off, loading or unreadable = FIT-5a's page exactly.
  const sharedDisplay = useFitSharedDisplayEnabled()

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to={ROUTES.JOB_FIT.MATCHES}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#0D9488]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("fitHistoryPage.backToMatches", "Back to matches")}
      </Link>

      {snap.isLoading && <FitLoading label={t("fitHistoryPage.loading", "Loading this fit report…")} />}

      {snap.isError && (
        <FitError>
          {snap.error.response?.status === 404
            ? t("fitHistoryPage.notInHistory", "This fit report isn't in your history.")
            : t(
                "fitHistoryPage.loadError",
                "We couldn't load this fit report. Please try again shortly.",
              )}
        </FitError>
      )}

      {snap.data && (
        <>
          <FitPageHeader
            icon={History}
            title={
              snap.data.roleTitle ||
              (snap.data.source === "matches"
                ? t("fitHistoryPage.yourRoleMatches", "Your role matches")
                : t("fitHistoryPage.fitReport", "Fit report"))
            }
            description={t("fitHistoryPage.recorded", {
              defaultValue: "Recorded {{when}} · {{engine}}",
              when: new Date(snap.data.computedAt).toLocaleString(),
              engine: snap.data.engineVersion,
            })}
          />

          {isFitDetail(snap.data.payload) ? (
            <DetailSnapshot detail={snap.data.payload} shared={sharedDisplay} />
          ) : isMatchList(snap.data.payload) ? (
            <MatchesSnapshot matches={snap.data.payload} />
          ) : (
            <FitCard>
              <FitSectionTitle>{t("fitHistoryPage.savedReport", "Saved report")}</FitSectionTitle>
              {snap.data.fitScore != null && (
                <FitPill tone={fitPercentTone(snap.data.fitScore)}>{t("fitHistoryPage.fitPercent", {
                    defaultValue: "{{pct}}% fit",
                    pct: snap.data.fitScore,
                  })}
                </FitPill>
              )}
              {typeof (snap.data.payload as Record<string, unknown>).overview === "string" &&
              (snap.data.payload as Record<string, unknown>).overview ? (
                <p className="mt-3 text-sm leading-relaxed text-[#374151]">
                  {String((snap.data.payload as Record<string, unknown>).overview)}
                </p>
              ) : (
                <p className="mt-3 text-sm text-[#6b7280]">
                  {t("fitHistoryPage.headlineOnly", "This save kept only its headline.")}
                </p>
              )}
            </FitCard>
          )}
        </>
      )}
    </div>
  )
}

function DetailSnapshot({ detail, shared }: { detail: FitDetail; shared: boolean }) {
  return (
    <FitResult variant="recorded" data={detail} breakdown={<FitBreakdown data={detail} />} shared={shared} />
  )
}

function MatchesSnapshot({ matches }: { matches: FitMatch[] }) {
  const { t } = useTranslation("jobFitPages")
  // FIT-1: each row as it was ranked that day — its own read, not always the gap read.
  return (
    <FitMatchList
      variant="recorded"
      matches={matches}
      slots={{
        empty: <FitEmptyState>
            {t(
              "fitHistoryPage.noRolesRecorded",
              "No roles were available to match against when this was recorded.",
            )}
          </FitEmptyState>,
        wrapList: (list) => (
          <FitCard>
            <FitSectionTitle>{t("fitHistoryPage.rolesRanked", "Roles as ranked that day")}</FitSectionTitle>
            {list}
          </FitCard>
        ),
      }}
    />
  )
}
