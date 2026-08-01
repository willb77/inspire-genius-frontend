import { ArrowRight, CircleDashed, Info } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"

/**
 * Stage 4 — "What does that pay?"
 *
 * The stage that puts a number next to each career area the previous step
 * turned up, so nobody spends three months retraining towards something that
 * can't cover their rent.
 *
 * ## The constraint this file exists to enforce
 *
 * **A range, with its source and its date. Never a point estimate.**
 *
 * Someone reads a salary figure on a page like this and then signs a lease, or
 * turns down an offer, or tells their partner it's going to be fine. A single
 * number implies a precision that market data does not have, and an undated one
 * is a rumour with a font. So `SalaryRange` below requires `low`, `median`,
 * `high`, `source` and `asOf` — a bare median is not expressible in the type,
 * and `SalaryRangeCard` additionally refuses at runtime if the provenance is
 * blank or the bounds are out of order, because the data arrives from an API
 * and types stop at the network boundary.
 *
 * That is a correctness guard. Please don't relax it to make a layout easier.
 *
 * ## State of the backend
 *
 * The market-data adapter lands in **Phase 4 and does not exist yet**. There is
 * no service call and no illustrative figure anywhere on this page — a made-up
 * salary is exactly the sort of thing that would get quietly believed. When the
 * adapter ships, the change is confined to `useSalaryRanges` below; the card
 * and the page body stay as they are.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The shape Phase 4 has to fill.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * A pay range with the provenance that makes it usable.
 *
 * Every field below is required on purpose. Adding `median?: number` alone, or
 * dropping `source`, would let a point estimate through — which is the one
 * outcome this type exists to prevent.
 */
export type SalaryRange = {
  /** Lower bound of the reported range, in whole currency units. */
  low: number
  median: number
  /** Upper bound of the reported range, in whole currency units. */
  high: number
  /** Who published it, named plainly enough that a reader could go and check. */
  source: string
  /** ISO date (`YYYY-MM` or `YYYY-MM-DD`) the source was published or refreshed. */
  asOf: string
  /** ISO 4217. Defaults to USD when the adapter doesn't say. */
  currency?: string
  /** Where the range applies. A national figure and a city figure differ a lot. */
  region?: string
}

export type RoleSalary = {
  /** The career area or role family this range belongs to. */
  role: string
  range: SalaryRange
}

type SalaryState = {
  ranges: RoleSalary[]
  /** False until Phase 4 ships the market-data adapter. */
  available: boolean
}

/**
 * The seam.
 *
 * A stub returning nothing, rather than a hook aimed at a route that isn't
 * built. Phase 4 replaces the body with the real query; the return shape is
 * already what the page reads.
 */
function useSalaryRanges(): SalaryState {
  return { ranges: [], available: false }
}

/* ────────────────────────────────────────────────────────────────────────────
 * Presentation.
 * ──────────────────────────────────────────────────────────────────────────── */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

/**
 * "2026-06-01" → "June 2026". Fixed month names rather than `toLocaleDateString`
 * so the rendered vintage is identical everywhere and in tests.
 */
function formatAsOf(asOf: string): string {
  const match = /^(\d{4})-(\d{2})/.exec(asOf)
  if (!match) return asOf
  const month = MONTHS[Number(match[2]) - 1]
  return month ? `${month} ${match[1]}` : asOf
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

/** Where the median sits within the range, as a percentage. Clamped for safety. */
function medianOffset(range: SalaryRange): number {
  const span = range.high - range.low
  if (span <= 0) return 50
  const pct = ((range.median - range.low) / span) * 100
  return Math.min(100, Math.max(0, pct))
}

/**
 * One role's pay range.
 *
 * Renders low / median / high with the source and vintage attached, or refuses
 * to render numbers at all when the provenance is missing or the bounds are
 * incoherent. Refusing is the correct behaviour: an unsourced number here is
 * worse than a gap, because a gap doesn't get acted on.
 */
export function SalaryRangeCard({ role, range }: RoleSalary) {
  const currency = range.currency ?? "USD"
  const unsourced = !range.source.trim() || !range.asOf.trim()
  const incoherent = !(range.low <= range.median && range.median <= range.high)

  if (unsourced || incoherent) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="font-medium">{role}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We have pay data for this one, but not in a state we&apos;d put in
            front of you —{" "}
            {unsourced
              ? "it arrived without a source or a date."
              : "the reported figures don't line up."}{" "}
            We&apos;d rather show you nothing than a number you can&apos;t check.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">{role}</p>
          {range.region && (
            <span className="text-xs text-muted-foreground">{range.region}</span>
          )}
        </div>

        <div>
          <div
            className="relative h-2 w-full rounded-full bg-muted"
            role="img"
            aria-label={`Pay range for ${role}: ${formatMoney(
              range.low,
              currency
            )} to ${formatMoney(range.high, currency)}, midpoint ${formatMoney(
              range.median,
              currency
            )}`}
          >
            <div
              className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-primary"
              style={{ left: `${medianOffset(range)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">
              {formatMoney(range.low, currency)}
            </span>
            <span className="font-medium">
              {formatMoney(range.median, currency)}
            </span>
            <span className="text-muted-foreground">
              {formatMoney(range.high, currency)}
            </span>
          </div>
          <div className="mt-0.5 flex items-baseline justify-between text-[11px] text-muted-foreground">
            <span>Lower end</span>
            <span>Midpoint</span>
            <span>Upper end</span>
          </div>
        </div>

        {/* Never optional, never in a tooltip. If it's on the page, it's sourced. */}
        <p className="text-xs text-muted-foreground">
          Source: {range.source} · as of {formatAsOf(range.asOf)}
        </p>
      </CardContent>
    </Card>
  )
}

/* ──────────────────────────────────────────────────────────────────────────── */

export default function SalaryPage() {
  const navigate = useNavigate()
  const { ranges, available } = useSalaryRanges()

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">What does that pay?</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Step 4 of the journey. It puts real pay figures next to the career
          areas you&apos;re considering, so money is part of the decision from
          the start rather than a surprise three months in.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How we&apos;ll show it</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Always a range — the lower end, the midpoint and the upper end —
            never a single number. Pay varies enormously by employer, city and
            what you walk in with, and one figure hides all of that.
          </p>
          <p className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Every range will say where it came from and when it was collected.
              If we can&apos;t tell you that, we won&apos;t show you the number.
            </span>
          </p>
        </CardContent>
      </Card>

      {available && ranges.length > 0 ? (
        <section aria-labelledby="salary-ranges" className="space-y-3">
          <h2 id="salary-ranges" className="text-sm font-medium">
            Your career areas
          </h2>
          {ranges.map((item) => (
            <SalaryRangeCard
              key={item.role}
              role={item.role}
              range={item.range}
            />
          ))}
        </section>
      ) : (
        /* Honest empty state — no example figures, not even greyed-out ones. */
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDashed
                className="h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              This step isn&apos;t ready yet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              We&apos;re still connecting the pay data. We&apos;ve deliberately
              left this blank rather than filling it with example figures —
              people make real decisions on numbers like these, and a placeholder
              would get believed.
            </p>
            <p className="text-sm text-muted-foreground">
              You can carry on with the rest of the journey meanwhile. Picking
              your career areas is the step this one reads from, so it&apos;s the
              useful thing to do next.
            </p>
            <div className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.DIRECTION_SETTING.CAREERS)}
              >
                Look at career areas
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
