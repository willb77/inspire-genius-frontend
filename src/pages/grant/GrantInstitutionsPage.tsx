import { useEffect, useState } from "react"
import { Building2, Calculator, ShieldCheck, Award, GaugeCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStudentProfile } from "@/hooks/grant/useProfile"
import { useNetPrice } from "@/hooks/grant/useNetPrice"
import type { DependencyStatus, NetPriceEstimate, StudentProfile } from "@/types/grant"
import { GrantPageHeader, GrantCard, GrantEmptyState, GrantPill, GrantMeter } from "./_shared"
import { formatCurrency } from "./_format"

const DEPENDENCY_OPTIONS: { value: DependencyStatus; label: string }[] = [
  { value: "dependent", label: "Dependent" },
  { value: "independent", label: "Independent" },
  { value: "unknown", label: "Not sure" },
]

type FitBand = "Safety" | "Match" | "Reach"

type FitContext = {
  band: FitBand
  bandTone: "green" | "blue" | "amber"
  bandHint: string
  needMetPct: number
  needBlind: boolean
  autoMerit: boolean
}

/**
 * Derive an institution "fit" read from a net-price estimate plus the aid
 * profile. The math is deterministic (no guessing) — % of demonstrated need met
 * drives the band and the need-blind vs. need-aware flag; GPA gates the
 * auto-merit hint. Standing in for the live net-price-calculator intelligence.
 */
function deriveFit(est: NetPriceEstimate, profile?: StudentProfile): FitContext {
  const sai = profile?.studentAidIndex ?? 0
  const demonstratedNeed = Math.max(0, est.costOfAttendance - sai)
  const needMetPct =
    demonstratedNeed > 0
      ? Math.min(100, Math.round((est.estimatedGrantAid / demonstratedNeed) * 100))
      : 100

  const band: FitBand =
    est.netPrice <= 10000 ? "Safety" : est.netPrice <= 20000 ? "Match" : "Reach"
  const bandTone = band === "Safety" ? "green" : band === "Match" ? "blue" : "amber"
  const bandHint =
    band === "Safety"
      ? "Net price sits comfortably within a typical family budget."
      : band === "Match"
        ? "A realistic cost — plan for the gap with scholarships or work-study."
        : "A stretch on cost — lean on appeals and outside scholarships."

  const needBlind = needMetPct >= 95
  const autoMerit = (profile?.gpa ?? 0) >= 3.5

  return { band, bandTone, bandHint, needMetPct, needBlind, autoMerit }
}

/**
 * UI-4 — Institutions.
 *
 * Net-price calculator: enter an institution and your household figures (pre-
 * filled from the aid profile) to estimate cost of attendance minus grant aid.
 * Each estimate is retained so several schools can be lined up side by side.
 * Backed by `useNetPrice` (mock for UI-0 → POST /v1/net-price when live).
 */
export default function GrantInstitutionsPage() {
  const { data: profile } = useStudentProfile()
  const { mutate, isPending } = useNetPrice()

  const [institution, setInstitution] = useState("")
  const [income, setIncome] = useState("")
  const [dependency, setDependency] = useState<DependencyStatus>("dependent")
  const [state, setState] = useState("")
  const [estimates, setEstimates] = useState<NetPriceEstimate[]>([])

  // Prefill from the profile once it loads (without clobbering user edits).
  useEffect(() => {
    if (!profile) return
    setIncome((cur) => (cur === "" ? String(profile.householdIncome) : cur))
    setDependency((cur) => (cur === "dependent" ? profile.dependencyStatus : cur))
    setState((cur) => (cur === "" ? profile.stateOfResidence : cur))
  }, [profile])

  function estimate(e: React.FormEvent) {
    e.preventDefault()
    const name = institution.trim()
    if (!name) return
    mutate(
      {
        institutionId: name,
        householdIncome: Number(income) || 0,
        dependencyStatus: dependency,
        stateOfResidence: state.trim(),
      },
      {
        onSuccess: (res) =>
          setEstimates((prev) => [{ ...res, institutionName: name }, ...prev.filter((p) => p.institutionName !== name)]),
      }
    )
  }

  return (
    <div className="max-w-3xl">
      <GrantPageHeader
        icon={Building2}
        title="Institutions"
        description="Estimate your net price — cost of attendance minus expected grant aid."
      />

      <GrantCard className="mb-6">
        <form onSubmit={estimate} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="inst-name" className="mb-1 block text-xs font-medium text-[#6b7280]">
              Institution
            </label>
            <Input
              id="inst-name"
              placeholder="e.g. State University"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="inst-income" className="mb-1 block text-xs font-medium text-[#6b7280]">
              Household income ($)
            </label>
            <Input
              id="inst-income"
              type="number"
              inputMode="numeric"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#6b7280]">Dependency</label>
            <Select value={dependency} onValueChange={(v) => setDependency(v as DependencyStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPENDENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="inst-state" className="mb-1 block text-xs font-medium text-[#6b7280]">
              State of residence
            </label>
            <Input
              id="inst-state"
              placeholder="CA"
              maxLength={2}
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full gap-2 bg-[#3B5BFF] hover:bg-[#2f4ad9]"
            >
              <Calculator className="h-4 w-4" />
              {isPending ? "Estimating…" : "Estimate net price"}
            </Button>
          </div>
        </form>
      </GrantCard>

      {estimates.length === 0 ? (
        <GrantEmptyState>Run an estimate to see your net price broken down here.</GrantEmptyState>
      ) : (
        <div className="space-y-4">
          {estimates.map((est) => {
            const aidPct =
              est.costOfAttendance > 0
                ? Math.round((est.estimatedGrantAid / est.costOfAttendance) * 100)
                : 0
            const fit = deriveFit(est, profile)
            return (
              <GrantCard key={est.institutionName}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-[#1f2937]">{est.institutionName}</h2>
                    <GrantPill tone={fit.bandTone}>{fit.band}</GrantPill>
                  </div>
                  <span className="text-lg font-bold text-[#3B5BFF]">
                    {formatCurrency(est.netPrice)}
                    <span className="ml-1 text-xs font-normal text-[#9ca3af]">net / yr</span>
                  </span>
                </div>
                <div className="mb-2 h-2.5 w-full overflow-hidden rounded-full bg-[#eef2ff]">
                  <div className="h-full bg-[#2DD4BF]" style={{ width: `${aidPct}%` }} />
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <dt className="text-xs text-[#9ca3af]">Cost of attendance</dt>
                    <dd className="font-semibold text-[#374151]">
                      {formatCurrency(est.costOfAttendance)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#9ca3af]">Est. grant aid</dt>
                    <dd className="font-semibold text-[#15803d]">
                      −{formatCurrency(est.estimatedGrantAid)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#9ca3af]">Aid covers</dt>
                    <dd className="font-semibold text-[#0f766e]">{aidPct}%</dd>
                  </div>
                </dl>

                {/* Fit context — % of demonstrated need met + institutional-aid flags. */}
                <div className="mt-4 border-t border-[#f3f4f6] pt-4">
                  <div className="mb-1 flex items-start gap-1.5 text-xs text-[#6b7280]">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9ca3af]" />
                    <span>
                      <span className="font-medium text-[#374151]">{fit.band}.</span> {fit.bandHint}
                    </span>
                  </div>
                  <GrantMeter
                    className="mb-3 mt-2"
                    value={fit.needMetPct}
                    tone={fit.needMetPct >= 95 ? "teal" : fit.needMetPct >= 80 ? "blue" : "amber"}
                    label="% of demonstrated need met"
                    right={`${fit.needMetPct}%`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1" title={
                      fit.needBlind
                        ? "Admissions don't factor your ability to pay, and this school meets essentially all demonstrated need."
                        : "This school weighs ability to pay and may leave part of your demonstrated need unmet (a gap)."
                    }>
                      <GrantPill tone={fit.needBlind ? "teal" : "amber"}>
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        {fit.needBlind ? "Need-blind" : "Need-aware"}
                      </GrantPill>
                    </span>
                    <span className="inline-flex items-center gap-1" title={
                      fit.autoMerit
                        ? "Your GPA clears a typical automatic-merit threshold — expect merit aid without a separate application."
                        : "Merit aid here is competitive rather than automatic at your current GPA — apply for it explicitly."
                    }>
                      <GrantPill tone={fit.autoMerit ? "blue" : "gray"}>
                        <Award className="mr-1 h-3 w-3" />
                        {fit.autoMerit ? "Auto-merit likely" : "Merit by application"}
                      </GrantPill>
                    </span>
                    <span className="inline-flex items-center gap-1" title="Satisfactory Academic Progress: hold a minimum GPA and credit pace once enrolled, or aid can be suspended.">
                      <GrantPill tone="gray">
                        <GaugeCircle className="mr-1 h-3 w-3" />
                        SAP required
                      </GrantPill>
                    </span>
                  </div>
                </div>
              </GrantCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
