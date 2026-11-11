import { useMemo, type ReactNode } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, Route as RouteIcon, Target } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitDetail } from "@/hooks/job-fit/useFitDetail"
import {
  FitPageHeader,
  FitPill,
  FitEmptyState,
  FitLoading,
  FitError,
  PartialProfileNote,
  FitCard,
  FitSectionTitle,
} from "@/components/fit/primitives"
import { jobFitNarrativeEnabled, displayFitPercent, parseFitMethod } from "@/components/fit/fit"
import { FitStatTiles } from "@/components/fit/FitResult"
import { FitComponentsCard } from "./FitComponentsCard"
import { useJobFitComponentsEnabled } from "@/hooks/switches/useJobFitComponentsEnabled"
import { useFitComponents } from "@/hooks/job-fit/useFitComponents"
import { useGoalTargetsEnabled } from "@/hooks/switches/useGoalTargetsEnabled"
import { useFitSharedDisplayEnabled } from "@/hooks/switches/useFitSharedDisplayEnabled"
import { MakeTargetCard } from "./MakeTargetCard"
import { FitBreakdown } from "./FitBreakdown"
import { FitSummaryCard } from "./FitSummaryCard"
import { FitFollowUpCard } from "./FitFollowUpCard"
import { FitActionsBar } from "./FitActionsBar"
import { FitScoreHeadline } from "@/components/fit/FitScoreHeadline"
import { FitCards } from "@/components/fit/FitCards"
import { fitCardGroups } from "@/components/fit/FitCardsModel"
import { useJobDnaDetail } from "@/hooks/job-blueprint/useJobDna"
import { useOccupation, useOccupationPay } from "@/hooks/job-fit/useOccupation"
import {
  EDUCATION_AREA_LABEL,
  FIT_V2_SECTION_TITLES,
  educationSection,
  localPaySection,
  occupationCode,
  rankedGrowthAreas,
  readJobReference,
  referenceSection,
  skillsSection,
  type FitV2Report,
  type SectionText,
} from "@/lib/job-fit/fitReport"
import type { FitDetail } from "@/types/job-fit"
import { FavoriteButton } from "./FavoriteButton"
import { HeadlineGrowthArea } from "./HeadlineGrowthArea"
import { ProfileVsRole } from "./ProfileVsRole"

const [T_FIT, , T_CARDS, T_REFERENCE, T_SKILLS, , T_LOCAL] = FIT_V2_SECTION_TITLES

/** A section's lines; an empty state reads as muted text, never a blank card. */
function SectionLines({ text }: { text: SectionText }) {
  const tone = text.empty ? "text-sm text-[#6b7280]" : "text-sm text-[#374151]"
  return text.lines.length === 1 ? (
    <p className={tone}>{text.lines[0]}</p>
  ) : (
    <ul className={`space-y-1 ${tone}`}>
      {text.lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  )
}

/**
 * O*NET skills. `skillsMatch` is the JF-12 mount point: the have / to-build
 * card (`SkillsMatch.tsx`) is passed here as one prop when it lands. Until
 * then the section lists the occupation's O*NET skills.
 */
function OnetSkillsSection({
  text,
  attribution,
  skillsMatch,
}: {
  text: SectionText
  attribution?: string | null
  skillsMatch?: ReactNode
}) {
  return (
    <div data-jf6-section="skills">
      <FitCard className="mb-6">
        <FitSectionTitle>{T_SKILLS}</FitSectionTitle>
        <SectionLines text={text} />
        {skillsMatch}
        {attribution && !text.empty && <p className="mt-3 text-xs text-[#9ca3af]">{attribution}</p>}
      </FitCard>
    </div>
  )
}

/**
 * JF-6 — the Careers and Jobs job page, in this order: % fit (no gap score) →
 * headline growth area → card graphic → SOC / O*NET → O*NET skills → "Your
 * profile versus the role" (top 3) → local pay and education → Save to
 * Favorites → My Goals (make target) → Career Pathway. Drawn only for a
 * priority-scored read (see FitDetailPage); everything else is today's page.
 */
function JobPageV2({
  data,
  report,
  narrative,
  targetsOn,
  resumeHref,
  attribution,
}: {
  data: FitDetail
  report: FitV2Report
  narrative: boolean
  targetsOn: boolean
  resumeHref?: string
  attribution?: string | null
}) {
  return (
    <>
      <FitPageHeader
        icon={Target}
        title={data.roleTitle}
        description="How your behavioral profile compares with the dimensions this role puts first."
      />

      {/* BP-F5: a partial-profile score says what it rests on. */}
      <PartialProfileNote coverage={data} />

      {/* PDF only (JF-6): Download PDF · Save · Write Résumé */}
      {narrative && <FitActionsBar data={data} resumeHref={resumeHref} v2={report} />}

      <div data-jf6-section="fit">
        <FitCard className="mb-6">
          <FitSectionTitle>{T_FIT}</FitSectionTitle>
          <FitScoreHeadline source={data} variant="summary" />
        </FitCard>
      </div>

      <div data-jf6-section="headline">
        <HeadlineGrowthArea growth={report.growth} />
      </div>

      <div data-jf6-section="cards">
        <FitCard className="mb-6">
          <FitSectionTitle>{T_CARDS}</FitSectionTitle>
          <p className="mb-4 text-sm text-[#6b7280]">
            The dimensions this role puts first: what the job asks for, your rating, and the difference. Hover,
            focus or tap a name for its definition.
          </p>
          <FitCards groups={report.groups} />
        </FitCard>
      </div>

      <div data-jf6-section="reference">
        <FitCard className="mb-6">
          <FitSectionTitle>{T_REFERENCE}</FitSectionTitle>
          <SectionLines text={report.reference} />
        </FitCard>
      </div>

      {/* JF-12 mounts SkillsMatch here: <OnetSkillsSection ... skillsMatch={<SkillsMatch … />} /> */}
      <OnetSkillsSection text={report.skills} attribution={attribution} />

      <div data-jf6-section="profile">
        <ProfileVsRole growth={report.growth} />
      </div>

      <div data-jf6-section="local">
        <FitCard className="mb-6">
          <FitSectionTitle>{T_LOCAL}</FitSectionTitle>
          <h3 className="mb-1 text-sm font-semibold text-[#1f2937]">Pay — {report.pay.areaLabel}</h3>
          <SectionLines text={report.pay} />
          <h3 className="mb-1 mt-4 text-sm font-semibold text-[#1f2937]">Education — {EDUCATION_AREA_LABEL}</h3>
          <SectionLines text={report.education} />
        </FitCard>
      </div>

      {/* Renders nothing unless the server says Favorites is on (JF-7). */}
      <div data-jf6-section="favorites">
        <FavoriteButton jobId={data.jobId} roleTitle={data.roleTitle} />
      </div>

      {targetsOn && (
        <div data-jf6-section="goals" className="mt-6">
          <MakeTargetCard data={data} />
        </div>
      )}

      <div data-jf6-section="pathway" className="mb-6 mt-6">
        <Link
          to={ROUTES.JOB_FIT.PATHWAY}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-3 py-2 text-sm font-medium text-white hover:bg-[#0b8078]"
        >
          <RouteIcon className="h-4 w-4" aria-hidden />
          Career Pathway
        </Link>
      </div>
    </>
  )
}

/**
 * Full fit breakdown for one role: closeness summary, a your-profile-vs-benchmark
 * radar, per-dimension gaps with coaching micro-habits, over-use flags, and
 * plain-language interview self-advocacy. Nothing here presents a hiring verdict.
 */
export default function FitDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  // FIT-1: open under the read the list row used (`?method=`), so the row and
  // this page show the same %. No/unknown param = the backend default (gap).
  const [searchParams] = useSearchParams()
  const method = parseFitMethod(searchParams.get("method"))
  const { data, isLoading, isError } = useFitDetail(jobId, method)
  const narrative = jobFitNarrativeEnabled()
  // Feeds Phase 2 — the components beside the fit. Idle (no request, no card)
  // unless the server switch is on, so the page is today's page by default.
  const componentsOn = useJobFitComponentsEnabled()
  const fitPct = data ? displayFitPercent(data) : 0
  const components = useFitComponents(
    data && jobId ? [{ jobId, fitScore: fitPct }] : [],
    componentsOn,
  )
  // Feeds Phase 3 — "Make this my target". Same rule: nothing renders and no
  // request is made unless the server's goal_targets switch is on.
  const targetsOn = useGoalTargetsEnabled()
  // FIT-5b — the shared fit display's wording (decision 3). Off, loading or
  // unreadable = FIT-5a's page exactly.
  const sharedDisplay = useFitSharedDisplayEnabled()
  // RW2 follow-up — "Write Résumé" always opens the Résumé Writer aimed at
  // this role. The basic inline writer is gone (Bill, Coord2 2026-10-24 23:13
  // EDT); with the server's resume_writer_tailored switch off, /my/resume says
  // it cannot aim at the role and lets the person name it.
  const resumeHref = jobId ? `${ROUTES.MY_RESUME}?jobId=${encodeURIComponent(jobId)}` : undefined

  // JF-6 — the Careers and Jobs layout. The on/off signal is the one JF-5's
  // cards use: the server scored this read on the role's priority dimensions
  // (`scoring: "priority-9"` with priority rows), which blueprint-service sets
  // only when `job_fit_v2` applies to the caller. Any other read (an older
  // payload, a 22-dimension read, a failed switch read) is today's page, and
  // none of the reads below is made: each is idle without its key.
  const cardGroups = useMemo(() => (data ? fitCardGroups(data) : null), [data])
  const job = useJobDnaDetail(cardGroups && jobId ? jobId : "")
  const reference = useMemo(() => readJobReference(job.data), [job.data])
  const code = cardGroups && !job.isLoading && !job.isError ? occupationCode(reference) : null
  const occupation = useOccupation(code)
  const pay = useOccupationPay(code)
  const report = useMemo<FitV2Report | null>(() => {
    if (!data || !cardGroups) return null
    const jobRead = { loading: job.isLoading, failed: job.isError }
    const occ = {
      loading: job.isLoading || occupation.isLoading,
      failed: job.isError || occupation.isError,
      read: occupation.data,
    }
    const payRead = { loading: job.isLoading || pay.isLoading, failed: job.isError || pay.isError, read: pay.data }
    return {
      groups: cardGroups,
      growth: rankedGrowthAreas(data),
      reference: referenceSection(reference, jobRead, occ),
      skills: skillsSection(code, occ),
      pay: localPaySection(code, payRead),
      education: educationSection(code, occ),
    }
  }, [
    data,
    cardGroups,
    reference,
    code,
    job.isLoading,
    job.isError,
    occupation.isLoading,
    occupation.isError,
    occupation.data,
    pay.isLoading,
    pay.isError,
    pay.data,
  ])

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to={ROUTES.JOB_FIT.MATCHES}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#0D9488]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to matches
      </Link>

      {isLoading && <FitLoading label="Loading your fit for this role…" />}

      {isError && (
        <FitError>We couldn&apos;t load this role&apos;s breakdown. Please try again shortly.</FitError>
      )}

      {!isLoading && !isError && data && report && (
        <JobPageV2
          data={data}
          report={report}
          narrative={narrative}
          targetsOn={targetsOn}
          resumeHref={resumeHref}
          attribution={occupation.data?.attribution ?? null}
        />
      )}

      {!isLoading && !isError && data && !report && (
        <>
          <FitPageHeader
            icon={Target}
            title={data.roleTitle}
            description="How your behavioral profile compares with this role, dimension by dimension."
          />

          {/* BP-F5: a partial-profile score says what it rests on. */}
          <PartialProfileNote coverage={data} />

          {/* Action toolbar: Download PDF · Export As · Print · Save · Email · Copy link · Write Résumé */}
          {narrative && <FitActionsBar data={data} resumeHref={resumeHref} />}

          {/* Closeness summary */}
          <FitStatTiles data={data} subject="role" className="mb-6" shared={sharedDisplay} />

          {/* No fit tier or base tier here (4.1, option D): the four-tier label
              rests on an uncalibrated cut, so the person sees the score only. */}
          {typeof data.blueprintVersion === "number" && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#6b7280]">
              <FitPill tone="gray">Scored against blueprint v{data.blueprintVersion}</FitPill>
            </div>
          )}

          {componentsOn && (
            <FitComponentsCard
              fitPct={fitPct}
              job={jobId ? components.data?.jobs[jobId] : undefined}
              weights={components.data?.weights}
              isError={components.isError}
              person={components.data?.person}
              benchmarksValidated={components.data?.benchmarksValidated}
            />
          )}

          {targetsOn && <MakeTargetCard data={data} />}

          {/* Fit narrative: plain-language read of the overlay + fit % + gaps */}
          {narrative && <FitSummaryCard data={data} />}

          {/* Radar, per-dimension gaps, growth focus, over-use, self-advocacy — shared with Fit a JD */}
          <FitBreakdown data={data} />

          {/* Inline follow-up — answers render right here, not in a separate chat */}
          {narrative && <FitFollowUpCard data={data} />}
        </>
      )}

      {!isLoading && !isError && !data && (
        <FitEmptyState>This role&apos;s fit breakdown isn&apos;t available.</FitEmptyState>
      )}
    </div>
  )
}
