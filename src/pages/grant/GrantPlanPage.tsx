import { useMemo } from "react"
import { Link } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import {
  Target,
  CalendarClock,
  Award,
  Wallet,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  UserRound,
  FileText,
  Search,
  ClipboardList,
  Scale,
  Check,
  Landmark,
  Route,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useStudentProfile } from "@/hooks/grant/useProfile"
import { useDeadlines } from "@/hooks/grant/useDeadlines"
import { useScholarships } from "@/hooks/grant/useScholarships"
import { useAwardLetters } from "@/hooks/grant/useAwardLetters"
import { useAidIntake } from "@/hooks/grant/useAidIntake"
import { readyToSearch, triggerProgress, TRIGGER_FIELDS } from "@/types/grant/intake"
import { ROUTES } from "@/constants/routes"
import { GrantPageHeader, GrantCard, GrantMeter, GrantPill, GrantSectionTitle } from "./_shared"
import { formatCurrency, formatDate, relativeDeadline } from "./_format"

type NextAction = { id: string; label: string; to: string }
type JourneyStep = { key: string; label: string; icon: LucideIcon; done: boolean }

/**
 * My Aid Plan — the consolidated read-only view stitching every GRANT tool
 * together: aid-profile readiness, potential scholarship dollars, the nearest
 * deadline, best offer, and Student Aid Index — plus grouped summary cards, an
 * aid-journey next-step cue (consistent with the dashboard), and a prioritized
 * next-actions list that deep-links into the relevant tool. Mock-backed hooks.
 */
export default function GrantPlanPage() {
  const { data: profile } = useStudentProfile()
  const { data: deadlines } = useDeadlines()
  const { data: scholarships } = useScholarships()
  const { data: awards } = useAwardLetters()
  const { data: intake } = useAidIntake()

  const aidReady = readyToSearch(intake ?? {})
  const answered = triggerProgress(intake ?? {})

  const nearestDeadline = useMemo(() => {
    const upcoming = [...(deadlines ?? [])]
      .filter((d) => d.status !== "submitted")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    return upcoming[0]
  }, [deadlines])

  const topScholarship = useMemo(
    () => [...(scholarships ?? [])].sort((a, b) => b.matchScore - a.matchScore)[0],
    [scholarships]
  )

  const potentialAid = useMemo(
    () => (scholarships ?? []).reduce((sum, s) => sum + s.amount, 0),
    [scholarships]
  )

  const bestOffer = useMemo(() => {
    const list = awards ?? []
    if (list.length === 0) return undefined
    return list.reduce((best, a) => (a.netCost < best.netCost ? a : best), list[0])
  }, [awards])

  const giftAidPct = bestOffer
    ? Math.round(((bestOffer.grants + bestOffer.scholarships) / bestOffer.costOfAttendance) * 100)
    : 0

  const steps: JourneyStep[] = useMemo(() => {
    const fafsaSubmitted = (intake ?? {}).fafsa_status === "submitted"
    const hasMatches = (scholarships?.length ?? 0) > 0
    const hasSubmittedApp = (deadlines ?? []).some((d) => d.status === "submitted")
    const hasOffers = (awards?.length ?? 0) > 0
    return [
      { key: "profile", label: "Profile", icon: UserRound, done: aidReady },
      { key: "fafsa", label: "FAFSA", icon: FileText, done: fafsaSubmitted },
      { key: "search", label: "Search", icon: Search, done: hasMatches },
      { key: "apply", label: "Apply", icon: ClipboardList, done: hasSubmittedApp },
      { key: "compare", label: "Compare", icon: Scale, done: hasOffers },
      { key: "plan", label: "Plan", icon: Target, done: false },
    ]
  }, [aidReady, intake, scholarships, deadlines, awards])

  const firstTodo = steps.findIndex((s) => !s.done)
  const activeIndex = firstTodo === -1 ? steps.length - 1 : firstTodo
  const activeStep = steps[activeIndex]
  const journeyPct = Math.round((steps.filter((s) => s.done).length / steps.length) * 100)

  const nextActions: NextAction[] = useMemo(() => {
    const actions: NextAction[] = []
    if (!aidReady) {
      actions.push({
        id: "intake",
        label: `Finish your aid profile — ${answered}/${TRIGGER_FIELDS.length} essentials answered`,
        to: ROUTES.GRANT.PROFILE,
      })
    }
    if (nearestDeadline) {
      actions.push({
        id: "deadline",
        label: `Submit ${nearestDeadline.name} — ${relativeDeadline(nearestDeadline.dueDate)}`,
        to: ROUTES.GRANT.APPLICATIONS,
      })
    }
    if (topScholarship) {
      actions.push({
        id: "scholarship",
        label: `Apply to ${topScholarship.name} (${formatCurrency(topScholarship.amount)})`,
        to: ROUTES.GRANT.SCHOLARSHIPS,
      })
    }
    if (bestOffer) {
      actions.push({
        id: "offer",
        label: `Review your best offer — ${bestOffer.institutionName} at ${formatCurrency(bestOffer.netCost)}/yr`,
        to: ROUTES.GRANT.COMPARE,
      })
    }
    return actions
  }, [aidReady, answered, nearestDeadline, topScholarship, bestOffer])

  return (
    <div className="max-w-4xl">
      <GrantPageHeader
        icon={Target}
        title="My Aid Plan"
        description={
          profile ? `${profile.fullName}'s consolidated financial-aid plan.` : "Your consolidated financial-aid plan."
        }
      />

      {/* Aid-journey next-step cue (consistent with the dashboard) */}
      <GrantCard className="mb-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(59,91,255,0.1)]">
              <Route className="h-4 w-4 text-[#3B5BFF]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#1f2937]">
                Step {activeIndex + 1} of {steps.length}: {activeStep.label}
              </p>
              <p className="text-xs text-[#6b7280]">Your active stage on the aid journey.</p>
            </div>
          </div>
          <GrantPill tone="blue">{journeyPct}% complete</GrantPill>
        </div>

        <ol className="flex items-start">
          {steps.map((step, i) => {
            const status = i === activeIndex ? "active" : step.done ? "done" : "todo"
            const Icon = step.icon
            const dotClass =
              status === "active"
                ? "border-[#3B5BFF] bg-[rgba(59,91,255,0.1)] text-[#3B5BFF] ring-4 ring-[rgba(59,91,255,0.12)]"
                : status === "done"
                  ? "border-[#2DD4BF] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
                  : "border-[#e5e7eb] bg-[#f3f4f6] text-[#9ca3af]"
            const labelClass =
              status === "active"
                ? "font-semibold text-[#1f2937]"
                : status === "done"
                  ? "text-[#374151]"
                  : "text-[#9ca3af]"
            return (
              <li key={step.key} className="flex flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  <span
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      i === 0 ? "opacity-0" : i <= activeIndex ? "bg-[#2DD4BF]" : "bg-[#e5e7eb]"
                    )}
                  />
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                      dotClass
                    )}
                  >
                    {status === "done" ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      i === steps.length - 1 ? "opacity-0" : i < activeIndex ? "bg-[#2DD4BF]" : "bg-[#e5e7eb]"
                    )}
                  />
                </div>
                <span className={cn("mt-2 text-center text-[11px]", labelClass)}>{step.label}</span>
              </li>
            )
          })}
        </ol>
      </GrantCard>

      {/* Headline figures */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GrantCard>
          <div className="mb-2 flex items-center gap-2 text-[#374151]">
            <Award className="h-4 w-4 text-[#2DD4BF]" />
            <h2 className="text-xs font-semibold">Potential aid</h2>
          </div>
          <p className="text-2xl font-bold text-[#1f2937]">{formatCurrency(potentialAid)}</p>
          <p className="mt-1 text-xs text-[#9ca3af]">across matched scholarships</p>
        </GrantCard>

        <GrantCard>
          <div className="mb-2 flex items-center gap-2 text-[#374151]">
            <CalendarClock className="h-4 w-4 text-[#3B5BFF]" />
            <h2 className="text-xs font-semibold">Next deadline</h2>
          </div>
          <p className="text-2xl font-bold text-[#1f2937]">
            {nearestDeadline ? formatDate(nearestDeadline.dueDate) : "—"}
          </p>
          <p className="mt-1 truncate text-xs text-[#9ca3af]">
            {nearestDeadline ? nearestDeadline.name : "nothing scheduled"}
          </p>
        </GrantCard>

        <GrantCard>
          <div className="mb-2 flex items-center gap-2 text-[#374151]">
            <Wallet className="h-4 w-4 text-[#3B5BFF]" />
            <h2 className="text-xs font-semibold">Best net cost</h2>
          </div>
          <p className="text-2xl font-bold text-[#1f2937]">
            {bestOffer ? formatCurrency(bestOffer.netCost) : "—"}
          </p>
          <p className="mt-1 truncate text-xs text-[#9ca3af]">
            {bestOffer ? bestOffer.institutionName : "no offers yet"}
          </p>
        </GrantCard>

        <GrantCard>
          <div className="mb-2 flex items-center gap-2 text-[#374151]">
            <GraduationCap className="h-4 w-4 text-[#3B5BFF]" />
            <h2 className="text-xs font-semibold">Student Aid Index</h2>
          </div>
          <p className="text-2xl font-bold text-[#1f2937]">
            {profile ? profile.studentAidIndex.toLocaleString() : "—"}
          </p>
          <p className="mt-1 text-xs text-[#9ca3af]">from your profile</p>
        </GrantCard>
      </div>

      {/* Grouped tool summaries */}
      <GrantSectionTitle>Plan at a glance</GrantSectionTitle>
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <GrantCard>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#374151]">
              <CalendarClock className="h-4 w-4 text-[#3B5BFF]" />
              <h3 className="text-sm font-semibold">Deadlines</h3>
            </div>
            <GrantPill tone="gray">{deadlines?.length ?? 0} tracked</GrantPill>
          </div>
          {(deadlines?.length ?? 0) === 0 ? (
            <p className="text-sm text-[#9ca3af]">No deadlines scheduled yet.</p>
          ) : (
            <ul className="space-y-2">
              {[...(deadlines ?? [])]
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, 3)
                .map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-[#1f2937]">{d.name}</span>
                    <span className="shrink-0 text-xs text-[#6b7280]">{relativeDeadline(d.dueDate)}</span>
                  </li>
                ))}
            </ul>
          )}
        </GrantCard>

        <GrantCard>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#374151]">
              <Award className="h-4 w-4 text-[#2DD4BF]" />
              <h3 className="text-sm font-semibold">Scholarships</h3>
            </div>
            <GrantPill tone="gray">{scholarships?.length ?? 0} matched</GrantPill>
          </div>
          {topScholarship ? (
            <div>
              <p className="text-sm text-[#1f2937]">{topScholarship.name}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-[#0f766e]">
                  {formatCurrency(topScholarship.amount)}
                </span>
                <GrantPill tone="teal">{topScholarship.matchScore}% match</GrantPill>
              </div>
              <p className="mt-1 text-xs text-[#9ca3af]">your strongest match</p>
            </div>
          ) : (
            <p className="text-sm text-[#9ca3af]">Complete your profile to see matches.</p>
          )}
        </GrantCard>

        <GrantCard>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#374151]">
              <Wallet className="h-4 w-4 text-[#3B5BFF]" />
              <h3 className="text-sm font-semibold">Net price</h3>
            </div>
            {bestOffer && <GrantPill tone="green">{giftAidPct}% gift aid</GrantPill>}
          </div>
          {bestOffer ? (
            <div>
              <p className="text-sm text-[#1f2937]">{bestOffer.institutionName}</p>
              <GrantMeter
                value={giftAidPct}
                tone="green"
                className="mt-2"
                label="Covered by gift aid"
                right={`${formatCurrency(bestOffer.netCost)}/yr net`}
              />
            </div>
          ) : (
            <p className="text-sm text-[#9ca3af]">Add an award letter to compare offers.</p>
          )}
        </GrantCard>

        <GrantCard>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#374151]">
              <Landmark className="h-4 w-4 text-[#3B5BFF]" />
              <h3 className="text-sm font-semibold">Loans</h3>
            </div>
            <Link to={ROUTES.GRANT.LOANS} className="text-xs font-medium text-[#3B5BFF]">
              Plan repayment
            </Link>
          </div>
          {bestOffer ? (
            <div>
              <p className="text-2xl font-bold text-[#1f2937]">{formatCurrency(bestOffer.federalLoans)}</p>
              <p className="mt-1 text-xs text-[#9ca3af]">
                federal loans in your best offer{" "}
                {bestOffer.workStudy > 0 ? `· ${formatCurrency(bestOffer.workStudy)} work-study` : ""}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#9ca3af]">Model repayment once you have an offer.</p>
          )}
        </GrantCard>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-[#374151]">Your next actions</h2>
      {nextActions.length === 0 ? (
        <GrantCard className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-[#2DD4BF]" />
          <p className="text-sm text-[#374151]">
            You're all caught up — no outstanding aid actions right now.
          </p>
        </GrantCard>
      ) : (
        <ol className="space-y-2">
          {nextActions.map((a, i) => (
            <li key={a.id}>
              <Link
                to={a.to}
                className="flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-white p-4 transition hover:border-[#3B5BFF] hover:bg-[rgba(59,91,255,0.03)]"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(59,91,255,0.1)] text-xs font-semibold text-[#3B5BFF]">
                    {i + 1}
                  </span>
                  <span className="text-sm text-[#1f2937]">{a.label}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#3B5BFF]" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
