import { useState } from "react"
import { Banknote, LineChart, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRepayment } from "@/hooks/grant/useRepayment"
import { useSalary } from "@/hooks/grant/useSalary"
import type { RepaymentPlanType } from "@/types/grant"
import { GrantPageHeader, GrantCard, GrantPill } from "./_shared"
import { formatCurrency } from "./_format"

const PLAN_OPTIONS: { value: RepaymentPlanType; label: string }[] = [
  { value: "standard", label: "Standard (10-year)" },
  { value: "graduated", label: "Graduated" },
  { value: "income-driven", label: "Income-driven (SAVE/RAP)" },
]

/** Payment-to-income affordability band using the entry-level monthly salary. */
function affordability(monthlyPayment: number, monthlyIncome: number) {
  if (monthlyIncome <= 0) return null
  const pct = Math.round((monthlyPayment / monthlyIncome) * 100)
  if (pct <= 8) return { pct, tone: "green" as const, label: "Comfortable" }
  if (pct <= 15) return { pct, tone: "amber" as const, label: "Manageable" }
  return { pct, tone: "red" as const, label: "High burden" }
}

/**
 * UI-6 — Loans & Debt.
 *
 * Two linked tools: a repayment projector (principal / rate / term / plan) and
 * an occupation salary lookup. When both are run, an affordability band frames
 * the projected payment against expected entry-level income. Backed by
 * `useRepayment` + `useSalary` (mock for UI-0 → live endpoints when wired).
 */
export default function GrantLoansPage() {
  const { mutate, data: estimate, isPending } = useRepayment()

  const [principal, setPrincipal] = useState("20000")
  const [rate, setRate] = useState("5.5")
  const [term, setTerm] = useState("120")
  const [plan, setPlan] = useState<RepaymentPlanType>("standard")

  const [occupationInput, setOccupationInput] = useState("")
  const [occupation, setOccupation] = useState("")
  const { data: salary } = useSalary(occupation)

  function project(e: React.FormEvent) {
    e.preventDefault()
    mutate({
      principal: Number(principal) || 0,
      annualRatePct: Number(rate) || 0,
      termMonths: Number(term) || 0,
      plan,
    })
  }

  function lookUp(e: React.FormEvent) {
    e.preventDefault()
    setOccupation(occupationInput.trim())
  }

  const band =
    estimate && salary
      ? affordability(estimate.monthlyPayment, salary.entryLevelSalary / 12)
      : null

  return (
    <div className="max-w-4xl">
      <GrantPageHeader
        icon={Banknote}
        title="Loans & Debt"
        description="Project monthly repayment and sanity-check it against expected earnings."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Repayment projector */}
        <GrantCard>
          <div className="mb-4 flex items-center gap-2">
            <LineChart className="h-4 w-4 text-[#3B5BFF]" />
            <h2 className="text-sm font-semibold text-[#374151]">Repayment projector</h2>
          </div>
          <form onSubmit={project} className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="loan-principal" className="mb-1 block text-xs font-medium text-[#6b7280]">
                Principal ($)
              </label>
              <Input
                id="loan-principal"
                type="number"
                inputMode="numeric"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="loan-rate" className="mb-1 block text-xs font-medium text-[#6b7280]">
                Rate (%)
              </label>
              <Input
                id="loan-rate"
                type="number"
                step="0.1"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="loan-term" className="mb-1 block text-xs font-medium text-[#6b7280]">
                Term (months)
              </label>
              <Input
                id="loan-term"
                type="number"
                inputMode="numeric"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#6b7280]">Plan</label>
              <Select value={plan} onValueChange={(v) => setPlan(v as RepaymentPlanType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="col-span-2 mt-1 bg-[#3B5BFF] hover:bg-[#2f4ad9]"
            >
              {isPending ? "Calculating…" : "Project repayment"}
            </Button>
          </form>

          {estimate && (
            <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[#f0f1f3] pt-4 text-center">
              <div>
                <dt className="text-xs text-[#9ca3af]">Monthly</dt>
                <dd className="text-lg font-bold text-[#3B5BFF]">
                  {formatCurrency(estimate.monthlyPayment)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#9ca3af]">Total paid</dt>
                <dd className="text-lg font-bold text-[#1f2937]">
                  {formatCurrency(estimate.totalPaid)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#9ca3af]">Interest</dt>
                <dd className="text-lg font-bold text-[#b45309]">
                  {formatCurrency(estimate.totalInterest)}
                </dd>
              </div>
            </dl>
          )}
        </GrantCard>

        {/* Salary lookup + affordability */}
        <GrantCard>
          <div className="mb-4 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-[#2DD4BF]" />
            <h2 className="text-sm font-semibold text-[#374151]">Expected earnings</h2>
          </div>
          <form onSubmit={lookUp} className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="salary-occ" className="mb-1 block text-xs font-medium text-[#6b7280]">
                Occupation
              </label>
              <Input
                id="salary-occ"
                placeholder="e.g. Software Developer"
                value={occupationInput}
                onChange={(e) => setOccupationInput(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline">
              Look up
            </Button>
          </form>

          {salary && (
            <>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[#f0f1f3] pt-4 text-center">
                <div>
                  <dt className="text-xs text-[#9ca3af]">Median</dt>
                  <dd className="text-base font-bold text-[#1f2937]">
                    {formatCurrency(salary.medianAnnualSalary)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#9ca3af]">Entry level</dt>
                  <dd className="text-base font-bold text-[#1f2937]">
                    {formatCurrency(salary.entryLevelSalary)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#9ca3af]">10-yr growth</dt>
                  <dd className="text-base font-bold text-[#15803d]">
                    +{salary.projectedGrowthPct}%
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-[#9ca3af]">{salary.occupation}</p>
            </>
          )}

          {band && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-[#f9fafb] px-3 py-2">
              <span className="text-xs text-[#6b7280]">
                Payment is {band.pct}% of entry-level monthly income
              </span>
              <GrantPill tone={band.tone}>{band.label}</GrantPill>
            </div>
          )}
        </GrantCard>
      </div>
    </div>
  )
}
