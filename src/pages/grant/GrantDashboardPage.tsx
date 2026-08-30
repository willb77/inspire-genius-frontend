import { useMemo } from "react"
import { Link } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import {
  GraduationCap,
  CalendarClock,
  Award,
  Sparkles,
  ArrowRight,
  UserRound,
  FileText,
  Search,
  ClipboardList,
  Scale,
  Target,
  Check,
  ListChecks,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useStudentProfile } from "@/hooks/grant/useProfile"
import { useDeadlines } from "@/hooks/grant/useDeadlines"
import { useScholarships } from "@/hooks/grant/useScholarships"
import { useAwardLetters } from "@/hooks/grant/useAwardLetters"
import { useAidIntake } from "@/hooks/grant/useAidIntake"
import {
  readyToSearch,
  triggerProgress,
  TRIGGER_FIELDS,
  activeModuleIds,
} from "@/types/grant/intake"
import { ROUTES } from "@/constants/routes"
import { GrantPageHeader, GrantCard, GrantStat, GrantMeter, GrantPill, GrantSectionTitle } from "./_shared"
import { relativeDeadline } from "./_format"

type ChipTone = "blue" | "teal"
type NextAction = { id: string; label: string; to: string }
type JourneyStep = { key: string; label: string; icon: LucideIcon; done: boolean }

/** Friendly labels for the population modules an intake screener can activate. */
const MODULE_LABELS: Record<string, string> = {
  military: "Military / Veteran",
  justice: "Justice-impacted",
  disability: "Disability",
  adult: "Returning adult",
  first_time: "First-time student",
  foster: "Foster care",
  undocumented: "Undocumented / DACA",
  homeless: "Housing insecure",
  caregiver: "Caregiver",
  field: "Field-specific",
  tribal: "Tribal",
}

/**
 * GRANT vertical landing page. Renders inside the shared AppShell (light theme)
 * via GrantLayout. Consumes the mock-backed data hooks so the shell + gated nav
 * are verifiable end-to-end, plus an aid-intake CTA that leads users into the
 * interactive questionnaire until their essentials are complete. The aid-journey
 * strip, completeness meter, population chips, and next-actions list mirror the
 * consolidated plan so the two surfaces stay in sync.
 */
export default function GrantDashboardPage() {
  const { data: profile } = useStudentProfile()
  const { data: deadlines } = useDeadlines()
  const { data: scholarships } = useScholarships()
  const { data: awards } = useAwardLetters()
  const { data: intake } = useAidIntake()

  const aidReady = readyToSearch(intake ?? {})
  const answered = triggerProgress(intake ?? {})
  const completionPct = Math.round((answered / TRIGGER_FIELDS.length) * 100)

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

  const populationChips: { label: string; tone: ChipTone }[] = useMemo(() => {
    const chips: { label: string; tone: ChipTone }[] = []
    if ((intake ?? {}).first_generation) chips.push({ label: "First-gen", tone: "blue" })
    for (const id of activeModuleIds(intake ?? {})) {
      chips.push({ label: MODULE_LABELS[id] ?? id, tone: "teal" })
    }
    return chips
  }, [intake])

  const nearestDeadline = useMemo(() => {
    return [...(deadlines ?? [])]
      .filter((d) => d.status !== "submitted")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
  }, [deadlines])

  const topScholarship = useMemo(
    () => [...(scholarships ?? [])].sort((a, b) => b.matchScore - a.matchScore)[0],
    [scholarships]
  )

  const nextActions: NextAction[] = useMemo(() => {
    const actions: NextAction[] = []
    if (!aidReady) {
      actions.push({
        id: "intake",
        label: `Complete your aid profile — ${answered}/${TRIGGER_FIELDS.length} essentials answered`,
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
        label: `Apply to ${topScholarship.name}`,
        to: ROUTES.GRANT.SCHOLARSHIPS,
      })
    }
    return actions
  }, [aidReady, answered, nearestDeadline, topScholarship])

  return (
    <div className="max-w-5xl">
      {!aidReady && (
        <Link
          to={ROUTES.GRANT.PROFILE}
          className="mb-5 flex items-center justify-between rounded-xl border border-[#3B5BFF] bg-[rgba(59,91,255,0.06)] p-4 transition hover:bg-[rgba(59,91,255,0.1)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(59,91,255,0.12)]">
              <Sparkles className="h-4 w-4 text-[#3B5BFF]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1f2937]">Complete your aid profile</p>
              <p className="text-xs text-[#6b7280]">
                {answered}/{TRIGGER_FIELDS.length} essentials answered — finish to unlock your matches.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-sm font-medium text-[#3B5BFF]">
            Continue <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      <GrantPageHeader
        icon={GraduationCap}
        title="Aid Dashboard"
        description={profile ? `Welcome back, ${profile.fullName}.` : "Your financial-aid overview."}
      />

      {/* Aid journey strip + completeness meter */}
      <GrantCard className="mb-6">
        <GrantSectionTitle
          action={
            <span className="text-xs font-medium text-[#3B5BFF]">
              Next: {activeStep.label}
            </span>
          }
        >
          Aid journey
        </GrantSectionTitle>

        <GrantMeter
          value={completionPct}
          tone="blue"
          label="Profile completeness"
          right={`${answered}/${TRIGGER_FIELDS.length}`}
          className="mb-5"
        />

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
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                      dotClass
                    )}
                  >
                    {status === "done" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
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

      {/* Headline stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GrantStat
          icon={CalendarClock}
          label="Upcoming Deadlines"
          value={deadlines?.length ?? 0}
          hint="federal, state & institutional"
          tone="blue"
        />
        <GrantStat
          icon={Award}
          label="Scholarship Matches"
          value={scholarships?.length ?? 0}
          hint="ranked by match score"
          tone="teal"
        />
        <GrantStat
          icon={GraduationCap}
          label="Student Aid Index"
          value={profile ? profile.studentAidIndex.toLocaleString() : "—"}
          hint="from your financial profile"
          tone="blue"
        />
      </div>

      {/* Populations + next actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GrantCard>
          <GrantSectionTitle>GRANT is tailoring for</GrantSectionTitle>
          {populationChips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {populationChips.map((chip) => (
                <GrantPill key={chip.label} tone={chip.tone}>
                  {chip.label}
                </GrantPill>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Users className="h-4 w-4 text-[#9ca3af]" />
              <p>Answer the screener in your profile to unlock population-specific aid.</p>
            </div>
          )}
        </GrantCard>

        <GrantCard>
          <GrantSectionTitle>Next actions</GrantSectionTitle>
          {nextActions.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-[#374151]">
              <Check className="h-4 w-4 text-[#2DD4BF]" />
              <p>You're all caught up — nothing outstanding right now.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {nextActions.map((action) => (
                <li key={action.id}>
                  <Link
                    to={action.to}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2.5 transition hover:border-[#3B5BFF] hover:bg-[rgba(59,91,255,0.03)]"
                  >
                    <span className="flex items-center gap-2.5">
                      <ListChecks className="h-4 w-4 shrink-0 text-[#3B5BFF]" />
                      <span className="text-sm text-[#1f2937]">{action.label}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#3B5BFF]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GrantCard>
      </div>
    </div>
  )
}
