import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Compass, GraduationCap, Route as RouteIcon, Sparkles } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { CAREERS_AND_JOBS_LABEL } from "@/constants/vertical-subnav"
import { useVerticalAccess } from "@/verticals/core"
import { useCareerExerciseSwitch } from "@/hooks/career-exercise/useCounselorCareerExercise"
import {
  discoveryErrorMessage,
  useDiscoveryCareers,
  useDiscoveryJourney,
  useDiscoveryStatus,
} from "@/hooks/career-discovery/useCareerDiscovery"
import MatchesPage from "./MatchesPage"
import { FavoritesList } from "./FavoritesList"

/**
 * JF-8 — Careers and Jobs (D6), the one page that Career Fit's "My fit", its
 * Growth areas page and Discovery's Career areas step now land on.
 *
 * Rendered ONLY while `job_fit_v2` applies to the signed-in person: the route
 * table decides (see `JobFitV2Route` in `routes.tsx`). With the switch off — no
 * row, false, loading or an unreadable status — every one of those URLs renders
 * exactly what it did before JF-8, and this page is never mounted.
 *
 * Order, top to bottom: the fields that suit you (D4 — today's Career areas
 * data, no new source) → favorites → the jobs, ranked (today's My fit list,
 * each row opening the JF-6 job page) → Pathway → Learning and Education.
 *
 * The fields section needs the `career-discovery` entitlement, its server
 * switch and Discovery's first step; without any of them it says what is
 * missing or stays out of the way. It never calls Discovery for an account
 * that is not entitled to it.
 */
export default function JobFitHome() {
  const discovery = useVerticalAccess("career-discovery")
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#1f2937]">{CAREERS_AND_JOBS_LABEL}</h1>
        <p className="text-[#6b7280]">
          The kinds of work that suit you, the jobs in them, and the way in.
        </p>
      </header>

      {discovery.hasAccess && <FieldsSection />}

      <FavoritesList />

      <section aria-label="Jobs">
        <MatchesPage />
      </section>

      <NextSteps learning={discovery.hasAccess} />
    </div>
  )
}

/** D4 — the fields that suit you, from Discovery's Career areas read. */
function FieldsSection() {
  const status = useDiscoveryStatus()
  const on = status.data?.enabled === true
  const journey = useDiscoveryJourney(on)
  const mayProceed = journey.data?.mayProceed === true
  const careers = useDiscoveryCareers(on && mayProceed)

  // Discovery switched off for this tier, or still checking: no section at all,
  // exactly as an account without Discovery sees it.
  if (status.isLoading || (!status.isError && !on)) return null

  return (
    <section aria-labelledby="fields-heading" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 id="fields-heading" className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
        <Compass className="h-4 w-4 text-[#0D9488]" aria-hidden />
        Fields that suit you
      </h2>
      <p className="mt-1 text-sm text-[#475569]">
        Kinds of work ranked against how you&apos;re wired. Closer is a better natural fit — not the only
        thing you can do.
      </p>
      <FieldsBody
        statusError={status.isError ? status.error : null}
        journeyLoading={journey.isLoading}
        journeyError={journey.isError ? journey.error : null}
        mayProceed={mayProceed}
        careers={careers}
      />
    </section>
  )
}

function FieldsBody({
  statusError,
  journeyLoading,
  journeyError,
  mayProceed,
  careers,
}: {
  statusError: unknown
  journeyLoading: boolean
  journeyError: unknown
  mayProceed: boolean
  careers: ReturnType<typeof useDiscoveryCareers>
}) {
  if (statusError) return <FieldsAlert message={discoveryErrorMessage(statusError)} />
  if (journeyLoading) return <FieldsStatus label="Loading your fields…" />
  if (journeyError) return <FieldsAlert message={discoveryErrorMessage(journeyError)} />
  if (!mayProceed) {
    return (
      <p className="mt-3 text-sm text-[#475569]">
        Answer the first step of Career &amp; Education Discovery to see the fields that suit you.{" "}
        <Link className="font-medium text-[#0D9488] underline-offset-2 hover:underline" to={ROUTES.CAREER_DISCOVERY.JOURNEY}>
          Go to the first step
        </Link>
      </p>
    )
  }
  if (careers.isLoading) return <FieldsStatus label="Ranking the fields that suit you…" />
  if (careers.isError || !careers.data) return <FieldsAlert message={discoveryErrorMessage(careers.error)} />
  const families = careers.data.families
  if (families.length === 0) {
    return (
      <p className="mt-3 text-sm text-[#475569]">
        {careers.data.note ?? "Add your PRISM and the fields that suit you will appear here."}
      </p>
    )
  }
  return (
    <ol className="mt-3 flex flex-wrap gap-2" aria-label="Fields that suit you">
      {families.map((f, i) => (
        <li
          key={f.family}
          className="rounded-full border border-slate-200 bg-[#F8FAFC] px-3 py-1 text-sm text-[#0F172A]"
        >
          {i + 1}. {f.family}{" "}
          <span className="text-[#64748B]">· {Math.round(f.affinity)}% natural fit</span>
        </li>
      ))}
    </ol>
  )
}

function FieldsStatus({ label }: { label: string }) {
  return (
    <p role="status" className="mt-3 text-sm text-[#475569]">
      {label}
    </p>
  )
}

function FieldsAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-3 text-sm text-[#B91C1C]">
      {message}
    </p>
  )
}

/** Pathway, then Learning and Education (only for an account with Discovery). */
function NextSteps({ learning }: { learning: boolean }) {
  return (
    <nav aria-label="Next steps" className="grid gap-3 sm:grid-cols-2">
      <StepLink
        to={ROUTES.JOB_FIT.PATHWAY}
        icon={<RouteIcon className="h-5 w-5 text-[#0D9488]" aria-hidden />}
        title="Career Pathway"
        text="Jobs you could move into next, and how to get there."
      />
      {learning && (
        <StepLink
          to={ROUTES.CAREER_DISCOVERY.EDUCATION}
          icon={<GraduationCap className="h-5 w-5 text-[#0D9488]" aria-hidden />}
          title="Learning and Education"
          text="The education and training that lead to these jobs, and what it costs."
        />
      )}
      {learning && <ExerciseStepLink />}
    </nav>
  )
}

/**
 * CX-5 link — the one way into the Career Exploration exercise from this page.
 * Only for an account with Discovery (the exercise route sits inside its
 * VerticalShell), and only once the server says `career_exercise` is on for
 * the signed-in person: off, loading or a failed read render nothing, so the
 * page is exactly what it was before.
 */
function ExerciseStepLink() {
  const sw = useCareerExerciseSwitch()
  if (sw !== "on") return null
  return (
    <StepLink
      to={ROUTES.CAREER_DISCOVERY.EXERCISE}
      icon={<Sparkles className="h-5 w-5 text-[#0D9488]" aria-hidden />}
      title="Career exploration"
      text="Work out how you work best, then test the careers worth a closer look."
    />
  )
}

function StepLink({ to, icon, title, text }: { to: string; icon: ReactNode; title: string; text: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-[#0D9488]/50"
    >
      {icon}
      <span className="flex-1">
        <span className="block text-sm font-semibold text-[#0F172A]">{title}</span>
        <span className="block text-xs text-[#64748B]">{text}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#64748B]" aria-hidden />
    </Link>
  )
}
