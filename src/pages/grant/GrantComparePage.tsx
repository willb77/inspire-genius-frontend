import { useMemo, useState } from "react"
import {
  Scale,
  Trophy,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Mail,
  ChevronDown,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useAwardLetters } from "@/hooks/grant/useAwardLetters"
import type { AwardLetter } from "@/types/grant"
import { GrantPageHeader, GrantCard, GrantEmptyState, GrantPill, GrantSectionTitle } from "./_shared"
import { formatCurrency } from "./_format"

/**
 * Deterministic package math for one award letter.
 * - giftAid  = grants + scholarships (money you keep)
 * - selfHelp = work-study (earned) + federal loans (repaid) — NOT discounts
 * - trueNet  = COA − gift aid  (what the offer really costs you)
 * - gap      = trueNet − self-help  (still unmet after taking every offered dollar)
 */
function packageMath(l: AwardLetter) {
  const giftAid = l.grants + l.scholarships
  const selfHelp = l.workStudy + l.federalLoans
  const trueNet = l.netCost
  const gap = Math.max(0, trueNet - selfHelp)
  return { giftAid, selfHelp, trueNet, gap, hasLoans: l.federalLoans > 0 }
}

/**
 * UI-5 — Compare Offers.
 *
 * Side-by-side award-letter comparison. Surfaces gift aid vs. self-help (loans +
 * work-study) per school and flags the lowest net-cost offer as best value.
 * Backed by `useAwardLetters` (mock for UI-0 → GET /v1/award-letters when live).
 */
export default function GrantComparePage() {
  const { data, isLoading } = useAwardLetters()
  const [appealOpen, setAppealOpen] = useState(false)

  const letters = useMemo(() => data ?? [], [data])
  const bestId = useMemo(() => {
    if (letters.length === 0) return null
    return letters.reduce((best, l) => (l.netCost < best.netCost ? l : best), letters[0]).id
  }, [letters])

  const best = letters.find((l) => l.id === bestId)
  // The most expensive offer is the natural appeal target: leverage the lower
  // net-cost school in the letter.
  const worst = useMemo(() => {
    if (letters.length < 2) return undefined
    return letters.reduce((hi, l) => (l.netCost > hi.netCost ? l : hi), letters[0])
  }, [letters])

  return (
    <div className="max-w-4xl">
      <GrantPageHeader
        icon={Scale}
        title="Compare Offers"
        description="Line up your award letters to see which offer costs the least out of pocket."
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : letters.length === 0 ? (
        <GrantEmptyState>
          No award letters yet — add them from the Application Concierge to compare offers.
        </GrantEmptyState>
      ) : (
        <>
          {best && (
            <GrantCard className="mb-5 flex items-center gap-3 border-[#2DD4BF] bg-[rgba(45,212,191,0.06)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(45,212,191,0.16)]">
                <Trophy className="h-4 w-4 text-[#0f766e]" />
              </div>
              <p className="text-sm text-[#374151]">
                <span className="font-semibold text-[#1f2937]">{best.institutionName}</span> is your
                lowest net cost at{" "}
                <span className="font-semibold text-[#0f766e]">{formatCurrency(best.netCost)}</span>{" "}
                per year.
              </p>
            </GrantCard>
          )}

          <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[#374151]">Institution</TableHead>
                  <TableHead className="text-right text-[#374151]">Cost</TableHead>
                  <TableHead className="text-right text-[#374151]">Grants</TableHead>
                  <TableHead className="text-right text-[#374151]">Scholarships</TableHead>
                  <TableHead className="text-right text-[#374151]">Work-study</TableHead>
                  <TableHead className="text-right text-[#374151]">Loans</TableHead>
                  <TableHead className="text-right text-[#374151]">Net cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {letters.map((l) => {
                  const isBest = l.id === bestId
                  return (
                    <TableRow key={l.id} className={cn(isBest && "bg-[rgba(45,212,191,0.05)]")}>
                      <TableCell className="font-medium text-[#1f2937]">
                        <span className="flex items-center gap-2">
                          {l.institutionName}
                          {isBest && <GrantPill tone="teal">Best value</GrantPill>}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-[#6b7280]">
                        {formatCurrency(l.costOfAttendance)}
                      </TableCell>
                      <TableCell className="text-right text-[#15803d]">
                        {formatCurrency(l.grants)}
                      </TableCell>
                      <TableCell className="text-right text-[#15803d]">
                        {formatCurrency(l.scholarships)}
                      </TableCell>
                      <TableCell className="text-right text-[#6b7280]">
                        {formatCurrency(l.workStudy)}
                      </TableCell>
                      <TableCell className="text-right text-[#b45309]">
                        {formatCurrency(l.federalLoans)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold",
                          isBest ? "text-[#0f766e]" : "text-[#1f2937]"
                        )}
                      >
                        {formatCurrency(l.netCost)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-[#9ca3af]">
            Net cost = cost of attendance minus gift aid (grants + scholarships). Loans and
            work-study are money you repay or earn, not discounts.
          </p>

          {/* Honest side-by-side: true net cost, gapping, and loans-dressed-as-aid. */}
          <div className="mt-8">
            <GrantSectionTitle>Priced honestly</GrantSectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {letters.map((l) => {
                const m = packageMath(l)
                const isBest = l.id === bestId
                return (
                  <GrantCard
                    key={l.id}
                    className={cn(isBest && "border-[#2DD4BF] bg-[rgba(45,212,191,0.05)]")}
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[#1f2937]">
                          {l.institutionName}
                        </h3>
                        {isBest && <GrantPill tone="teal">Lowest net cost</GrantPill>}
                      </div>
                      <span className="whitespace-nowrap text-xs text-[#9ca3af]">
                        COA {formatCurrency(l.costOfAttendance)}
                      </span>
                    </div>

                    <dl className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <dt className="text-[#6b7280]">Gift aid (grants + scholarships)</dt>
                        <dd className="font-semibold text-[#15803d]">
                          {formatCurrency(m.giftAid)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-[#6b7280]">Work-study (earned)</dt>
                        <dd className="font-medium text-[#6b7280]">{formatCurrency(l.workStudy)}</dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-[#6b7280]">Federal loans (repaid)</dt>
                        <dd className="font-medium text-[#b45309]">
                          {formatCurrency(l.federalLoans)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-3 flex items-center justify-between border-t border-[#f3f4f6] pt-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                        True net cost
                      </span>
                      <span
                        className={cn(
                          "text-lg font-bold",
                          isBest ? "text-[#0f766e]" : "text-[#1f2937]"
                        )}
                      >
                        {formatCurrency(m.trueNet)}
                        <span className="ml-1 text-xs font-normal text-[#9ca3af]">/ yr</span>
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {m.gap > 0 ? (
                        <div className="flex items-start gap-2 rounded-lg bg-[rgba(239,68,68,0.08)] p-2.5 text-xs text-[#b91c1c]">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            <span className="font-semibold">Gapped by {formatCurrency(m.gap)}.</span>{" "}
                            Even after every grant, loan, and work-study dollar, this much need is
                            left unmet — you'd cover it out of pocket.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-lg bg-[rgba(45,212,191,0.1)] p-2.5 text-xs text-[#0f766e]">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            <span className="font-semibold">No gap.</span> Offered aid covers your
                            full demonstrated need.
                          </span>
                        </div>
                      )}
                      {m.hasLoans && (
                        <div className="flex items-start gap-2 rounded-lg bg-[rgba(245,158,11,0.1)] p-2.5 text-xs text-[#b45309]">
                          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            <span className="font-semibold">
                              {formatCurrency(l.federalLoans)} labeled as "aid" is a loan.
                            </span>{" "}
                            It's bundled beside gift aid but you repay it with interest — it does not
                            lower true net cost.
                          </span>
                        </div>
                      )}
                    </div>
                  </GrantCard>
                )
              })}
            </div>
          </div>

          {/* Appeal-letter draft — leverage the lower net-cost offer. */}
          {best && worst && worst.id !== best.id && (
            <GrantCard className="mt-4">
              <button
                type="button"
                onClick={() => setAppealOpen((o) => !o)}
                className="flex w-full items-center justify-between gap-3 text-left"
                aria-expanded={appealOpen}
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(59,91,255,0.1)]">
                    <Mail className="h-4 w-4 text-[#3B5BFF]" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[#1f2937]">
                      Appeal-letter draft for {worst.institutionName}
                    </span>
                    <span className="block text-xs text-[#9ca3af]">
                      Cite {best.institutionName}'s {formatCurrency(best.netCost)} net cost to ask
                      for more aid
                    </span>
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-[#9ca3af] transition-transform",
                    appealOpen && "rotate-180"
                  )}
                />
              </button>

              {appealOpen && (
                <div className="mt-4 whitespace-pre-line rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-4 text-sm leading-relaxed text-[#374151]">
                  {`Dear ${worst.institutionName} Office of Financial Aid,

Thank you for admitting me and for the aid package you extended. ${worst.institutionName} remains my top choice, and I'm writing to respectfully request a review of my award.

After comparing my offers, my net cost at ${worst.institutionName} is ${formatCurrency(worst.netCost)} per year, versus ${formatCurrency(best.netCost)} at ${best.institutionName} — a difference of ${formatCurrency(worst.netCost - best.netCost)}. My family's financial circumstances are unchanged, and this gap makes attending difficult without additional grant or scholarship support.

Would you be able to reconsider my institutional grant aid in light of this comparison? I'm happy to provide any documentation that would help. Thank you for your time and consideration.

Sincerely,
[Your name]`}
                </div>
              )}
              <p className="mt-3 text-xs text-[#9ca3af]">
                Template only — review and personalize before sending. Appeals work best with a
                specific competing offer and a genuine reason.
              </p>
            </GrantCard>
          )}
        </>
      )}
    </div>
  )
}
