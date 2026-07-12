import { useState } from "react"
import { Banknote, LineChart, Briefcase, Info, Scale, CheckCircle2 } from "lucide-react"
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
import { GrantPageHeader, GrantCard, GrantPill, GrantMeter, GrantSectionTitle } from "./_shared"
import { formatCurrency } from "./_format"

const PLAN_OPTIONS: { value: RepaymentPlanType; label: string }[] = [
  { value: "standard", label: "Standard (10-year)" },
  { value: "graduated", label: "Graduated" },
  { value: "income-driven", label: "Income-driven (RAP)" },
]

/** Plan comparison metadata — RAP is the current GRANT-recommended default. */
const COMPARE_PLANS: {
  value: RepaymentPlanType
  name: string
  sub: string
  suffix: string
  best?: boolean
}[] = [
  {
    value: "income-driven",
    name: "RAP",
    sub: "New federal plan · 1–10% of income, up to 30 yrs",
    suffix: "/mo early career",
    best: true,
  },
  { value: "standard", name: "Standard (10-yr)", sub: "Fixed payment · lowest total interest", suffix: "/mo" },
  { value: "graduated", name: "Graduated", sub: "Starts low, rises every 2 years", suffix: "/mo start" },
]

/** Standard amortized monthly payment. Returns 0 for degenerate inputs. */
function amortizedMonthly(principal: number, annualRatePct: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal / termMonths
  return (principal * r) / (1 - Math.pow(1 + r, -termMonths))
}

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
 * Three linked tools: a repayment projector (principal / rate / term / plan), an
 * occupation salary lookup, and a plan comparison (RAP / Standard / Graduated).
 * When salary is known, a debt-to-income meter checks projected borrowing against
 * GRANT's 1× expected-salary ceiling and an affordability band frames the monthly
 * payment against entry-level income. Backed by `useRepayment` + `useSalary`
 * (mock for UI-0 → live endpoints when wired).
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

  const p = Number(principal) || 0
  const standardMonthly = amortizedMonthly(p, Number(rate) || 0, Number(term) || 0)
  const monthlyIncome = salary ? salary.entryLevelSalary / 12 : null
  // RAP is income-driven — only computable once expected earnings are known.
  const rapMonthly =
    salary != null ? Math.max(10, ((salary.entryLevelSalary - 15000) * 0.01) / 12) : null
  const planMonthly: Record<RepaymentPlanType, number | null> = {
    standard: standardMonthly,
    graduated: standardMonthly * 0.6,
    "income-driven": rapMonthly,
  }

  // Debt-to-income: projected borrowing vs. one year of expected entry-level salary.
  const debtRatio = salary ? p / salary.entryLevelSalary : null
  const dtiTone =
    debtRatio == null ? "gray" : debtRatio > 1 ? "red" : debtRatio > 0.7 ? "amber" : "green"

  const band =
    estimate && monthlyIncome != null
      ? affordability(estimate.monthlyPayment, monthlyIncome)
      : null

  return (
    <div className="max-w-4xl">
      <GrantPageHeader
        icon={Banknote}
        title="Loans & Debt"
        description="Project monthly repayment and sanity-check it against expected earnings."
      />

      {/* Policy callout — repayment rules changed in 2026. */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#3B5BFF]" />
        <p className="text-xs leading-relaxed text-[#6b7280]">
          <span className="font-semibold text-[#b45309]">Repayment changed in 2026.</span> The{" "}
          <span className="font-medium text-[#374151]">SAVE plan is closed to new enrollment</span>{" "}
          and is being phased out — superseded by the new{" "}
          <span className="font-medium text-[#374151]">Repayment Assistance Plan (RAP)</span> (1–10%
          of income, up to 30 years). New borrowers now choose between Standard and RAP.
        </p>
      </div>

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

        {/* Salary lookup + affordability + debt-to-income */}
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

          {debtRatio != null && (
            <div className="mt-4 border-t border-[#f0f1f3] pt-4">
              <div className="mb-2 flex items-center gap-2">
                <Scale className="h-4 w-4 text-[#3B5BFF]" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Debt-to-income
                </h3>
              </div>
              <GrantMeter
                value={Math.min(100, debtRatio * 100)}
                tone={dtiTone}
                label={`${debtRatio.toFixed(2)}× expected salary`}
                right={
                  <GrantPill tone={dtiTone}>
                    {debtRatio > 1 ? "Over ceiling" : debtRatio > 0.7 ? "Approaching" : "Healthy"}
                  </GrantPill>
                }
              />
              <p className="mt-2 text-xs text-[#9ca3af]">
                {debtRatio > 1
                  ? "Projected borrowing exceeds GRANT's 1× expected-salary ceiling — consider lower-cost aid before borrowing more."
                  : "GRANT keeps total borrowing under 1× your expected first-year salary. You're within a low-risk profile."}
              </p>
            </div>
          )}
        </GrantCard>
      </div>

      {/* Plan comparison */}
      <div className="mt-6">
        <GrantSectionTitle>Compare repayment plans</GrantSectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          {COMPARE_PLANS.map((pl) => {
            const monthly = planMonthly[pl.value]
            const selected = plan === pl.value
            return (
              <button
                key={pl.value}
                type="button"
                onClick={() => setPlan(pl.value)}
                aria-pressed={selected}
                className={
                  "rounded-xl border p-4 text-left transition " +
                  (selected
                    ? "border-[#3B5BFF] ring-1 ring-[#3B5BFF] bg-[rgba(59,91,255,0.04)]"
                    : "border-[#e5e7eb] bg-white hover:border-[#cbd5e1]")
                }
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#1f2937]">{pl.name}</span>
                  {pl.best && (
                    <GrantPill tone="teal">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      GRANT pick
                    </GrantPill>
                  )}
                </div>
                <p className="text-xs leading-snug text-[#9ca3af]">{pl.sub}</p>
                <p className="mt-3 text-2xl font-bold text-[#3B5BFF]">
                  {monthly != null ? formatCurrency(monthly) : "1–10%"}
                  <span className="ml-1 text-xs font-medium text-[#9ca3af]">
                    {monthly != null ? pl.suffix : "of income"}
                  </span>
                </p>
                {monthly == null && (
                  <p className="mt-1 text-xs text-[#9ca3af]">Add an occupation to estimate</p>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
