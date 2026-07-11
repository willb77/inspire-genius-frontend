import { useMemo } from "react"
import { Scale, Trophy } from "lucide-react"
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
import { GrantPageHeader, GrantCard, GrantEmptyState, GrantPill } from "./_shared"
import { formatCurrency } from "./_format"

/**
 * UI-5 — Compare Offers.
 *
 * Side-by-side award-letter comparison. Surfaces gift aid vs. self-help (loans +
 * work-study) per school and flags the lowest net-cost offer as best value.
 * Backed by `useAwardLetters` (mock for UI-0 → GET /v1/award-letters when live).
 */
export default function GrantComparePage() {
  const { data, isLoading } = useAwardLetters()

  const letters = useMemo(() => data ?? [], [data])
  const bestId = useMemo(() => {
    if (letters.length === 0) return null
    return letters.reduce((best, l) => (l.netCost < best.netCost ? l : best), letters[0]).id
  }, [letters])

  const best = letters.find((l) => l.id === bestId)

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
        </>
      )}
    </div>
  )
}
