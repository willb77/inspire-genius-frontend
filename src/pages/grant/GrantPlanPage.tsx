import { useMemo } from "react"
import { Link } from "react-router-dom"
import {
  Target,
  CalendarClock,
  Award,
  Wallet,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { useStudentProfile } from "@/hooks/grant/useProfile"
import { useDeadlines } from "@/hooks/grant/useDeadlines"
import { useScholarships } from "@/hooks/grant/useScholarships"
import { useAwardLetters } from "@/hooks/grant/useAwardLetters"
import { useAidIntake } from "@/hooks/grant/useAidIntake"
import { readyToSearch, triggerProgress, TRIGGER_FIELDS } from "@/types/grant/intake"
import { ROUTES } from "@/constants/routes"
import { GrantPageHeader, GrantCard } from "./_shared"
import { formatCurrency, formatDate, relativeDeadline } from "./_format"

type NextAction = { id: string; label: string; to: string }

/**
 * UI-7 — My Aid Plan.
 *
 * Consolidated read-only view stitching every GRANT tool together: aid-profile
 * readiness, potential scholarship dollars, the nearest deadline, best offer,
 * and Student Aid Index — plus a prioritized next-actions list that deep-links
 * into the relevant tool. All hooks are mock-backed for UI-0.
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
