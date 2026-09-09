import { Link, useParams } from "react-router-dom"
import { ArrowLeft, History, Target } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitSnapshot } from "@/hooks/job-fit/useFitHistory"
import type { FitDetail, FitMatch, FitSnapshot } from "@/types/job-fit"
import { FitPageHeader, FitCard, FitEmptyState, FitError, FitLoading, FitMeter, FitPill, FitSectionTitle } from "./_shared"
import { fitPercent, fitPercentLabel, fitPercentTone } from "./_fit"
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
  const { snapshotId } = useParams<{ snapshotId: string }>()
  const snap = useFitSnapshot(snapshotId)

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to={ROUTES.JOB_FIT.MATCHES}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#0D9488]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to matches
      </Link>

      {snap.isLoading && <FitLoading label="Loading this fit report…" />}

      {snap.isError && (
        <FitError>
          {snap.error.response?.status === 404
            ? "This fit report isn't in your history."
            : "We couldn't load this fit report. Please try again shortly."}
        </FitError>
      )}

      {snap.data && (
        <>
          <FitPageHeader
            icon={History}
            title={snap.data.roleTitle || (snap.data.source === "matches" ? "Your role matches" : "Fit report")}
            description={`Recorded ${new Date(snap.data.computedAt).toLocaleString()} · ${snap.data.engineVersion}`}
          />

          {isFitDetail(snap.data.payload) ? (
            <DetailSnapshot detail={snap.data.payload} />
          ) : isMatchList(snap.data.payload) ? (
            <MatchesSnapshot matches={snap.data.payload} />
          ) : (
            <FitCard>
              <FitSectionTitle>Saved report</FitSectionTitle>
              {snap.data.fitScore != null && (
                <FitPill tone={fitPercentTone(snap.data.fitScore)}>{snap.data.fitScore}% fit</FitPill>
              )}
              {typeof (snap.data.payload as Record<string, unknown>).overview === "string" &&
              (snap.data.payload as Record<string, unknown>).overview ? (
                <p className="mt-3 text-sm leading-relaxed text-[#374151]">
                  {String((snap.data.payload as Record<string, unknown>).overview)}
                </p>
              ) : (
                <p className="mt-3 text-sm text-[#6b7280]">This save kept only its headline.</p>
              )}
            </FitCard>
          )}
        </>
      )}
    </div>
  )
}

function DetailSnapshot({ detail }: { detail: FitDetail }) {
  const pct = fitPercent(detail.fitScore, detail.totalVariation, detail.perDimension.length || 22)
  return (
    <>
      <FitCard className="mb-6">
        <FitSectionTitle>Your fit as recorded</FitSectionTitle>
        <div className="mb-3 flex items-baseline gap-1">
          <span className="text-4xl font-bold text-[#1f2937]">{pct}</span>
          <span className="text-lg font-semibold text-[#6b7280]">%</span>
          <span className="ml-3 text-sm font-medium text-[#374151]">{fitPercentLabel(pct)}</span>
        </div>
        <FitMeter value={pct} tone={fitPercentTone(pct)} />
      </FitCard>
      <FitBreakdown data={detail} />
    </>
  )
}

function MatchesSnapshot({ matches }: { matches: FitMatch[] }) {
  if (matches.length === 0) {
    return <FitEmptyState>No roles were available to match against when this was recorded.</FitEmptyState>
  }
  return (
    <FitCard>
      <FitSectionTitle>Roles as ranked that day</FitSectionTitle>
      <ul className="divide-y divide-[#f1f3f5]">
        {matches.map((m) => {
          const pct = fitPercent(m.fitScore, m.totalVariation, 22)
          return (
            <li key={m.jobId} className="flex items-center gap-3 py-2 text-sm">
              <Target className="h-4 w-4 shrink-0 text-[#9ca3af]" aria-hidden />
              <Link to={ROUTES.JOB_FIT.detail(m.jobId)} className="min-w-0 flex-1 truncate font-medium text-[#1f2937] hover:text-[#0D9488]">
                {m.roleTitle}
              </Link>
              <FitPill tone={fitPercentTone(pct)}>{pct}% fit</FitPill>
            </li>
          )
        })}
      </ul>
    </FitCard>
  )
}
