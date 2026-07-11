import { useEffect, useState } from "react"
import { Building2, Calculator } from "lucide-react"
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
import type { DependencyStatus, NetPriceEstimate } from "@/types/grant"
import { GrantPageHeader, GrantCard, GrantEmptyState } from "./_shared"
import { formatCurrency } from "./_format"

const DEPENDENCY_OPTIONS: { value: DependencyStatus; label: string }[] = [
  { value: "dependent", label: "Dependent" },
  { value: "independent", label: "Independent" },
  { value: "unknown", label: "Not sure" },
]

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
            return (
              <GrantCard key={est.institutionName}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[#1f2937]">{est.institutionName}</h2>
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
              </GrantCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
