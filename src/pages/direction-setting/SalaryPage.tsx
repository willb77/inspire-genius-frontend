import {
  ArrowRight,
  CircleDashed,
  Info,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import { useMarketSalaries } from "@/hooks/direction-setting/useMarket"
import type {
  MarketArea,
  MarketOccupation,
  MarketOutlook,
} from "@/types/direction-setting"

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
 * ## Where the numbers come from, and why the page says so
 *
 * `GET /market/salaries` (via `useMarketSalaries`) prices the same career areas
 * Stage 3 ranked. Today the provider is a **curated static table** approximating
 * BLS OEWS May 2024, with employment projections on a `2023-2033` horizon, and
 * every payload states as much in its own `source` and `asOf` strings. Those are
 * rendered next to every figure on this page, not tucked into a tooltip: the
 * difference between a planning aid and an implied forecast is very largely
 * whether the reader can see the vintage. When a licensed provider is
 * configured the same fields start carrying its attribution, and nothing here
 * changes.
 *
 * ## Absence
 *
 * There is deliberately **no fallback figure** anywhere in this path. An
 * occupation we hold no wage series for arrives as `salary: null`, and an area
 * with nothing behind it arrives as `range: null` plus a sentence saying so.
 * (GRANT's old `_FALLBACK`, which invented $38,000 for anything it didn't
 * recognise, was retired this phase for exactly this reason.) So a null renders
 * as an explained gap — never as `$0`, never as a greyed-out example, and never
 * silently dropped from the list.
 *
 * Growth is signed. Some occupations are shrinking — one in today's table sits
 * at −5% — and it renders as a fall rather than being clamped at zero or hidden.
 */

/* ────────────────────────────────────────────────────────────────────────────
 * The shape the market adapter fills.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * A pay range with the provenance that makes it usable.
 *
 * Every field below is required on purpose. Adding `median?: number` alone, or
 * dropping `source`, would let a point estimate through — which is the one
 * outcome this type exists to prevent. The backend's `WageRange` requires the
 * same five fields for the same reason, so the contract holds at both ends.
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
 *
 * Anything that isn't a `YYYY-MM` date is returned untouched, which is a
 * passthrough rather than a fallback: a family roll-up spanning vintages arrives
 * as `"mixed: 2024-05, 2023-10"`, and an outlook arrives as a projection window
 * like `"2023-2033"`. Both read more honestly as written than as a guessed month.
 */
function formatAsOf(asOf: string): string {
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(asOf)
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

/**
 * A signed percentage, with the sign kept.
 *
 * `-5` renders as `-5%`, not `5%` and not `0%`. A projection that can only be
 * positive is a brochure, and a shrinking occupation is exactly the thing
 * somebody re-planning their working life needs told.
 */
function formatGrowth(pct: number): string {
  const rounded = Math.round(pct * 10) / 10
  return `${rounded > 0 ? "+" : ""}${rounded}%`
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

/**
 * An employment projection, with its direction, its window and its source.
 *
 * A fall is stated as a fall. It is also stated as *shrinking, not closed* — a
 * declining occupation still employs a very large number of people, and a
 * reader who has just been made redundant does not need this page sounding like
 * a door closing.
 */
export function OutlookLine({ outlook }: { outlook: MarketOutlook }) {
  const falling = outlook.growthPct < 0
  const flat = outlook.growthPct === 0
  const Icon = falling ? TrendingDown : TrendingUp

  return (
    <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
      <Icon
        className={
          falling
            ? "mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
            : "mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
        }
        aria-hidden
      />
      <span>
        Employment{" "}
        {falling
          ? "projected to fall"
          : flat
            ? "projected flat"
            : "projected to grow"}{" "}
        <span className="font-medium">{formatGrowth(outlook.growthPct)}</span>{" "}
        over {outlook.horizonYears} years ({formatAsOf(outlook.asOf)}).{" "}
        {falling ? "Shrinking is not the same as closed. " : ""}
        Source: {outlook.source}
      </span>
    </p>
  )
}

/**
 * One occupation inside a career area.
 *
 * Both halves are independently absent-able and both absences are spoken. A
 * suppressed wage series is a real and common thing in published data; it is
 * not a reason to print a plausible number, and it is not a reason to drop the
 * occupation off the list either.
 */
export function OccupationRow({ occupation }: { occupation: MarketOccupation }) {
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{occupation.title}</span>
        <span className="text-xs text-muted-foreground">{occupation.code}</span>
      </div>

      {occupation.salary ? (
        <p className="mt-1 text-sm">
          {formatMoney(occupation.salary.low, "USD")} –{" "}
          {formatMoney(occupation.salary.high, "USD")}{" "}
          <span className="text-muted-foreground">
            (midpoint {formatMoney(occupation.salary.median, "USD")})
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Source: {occupation.salary.source} · as of{" "}
            {formatAsOf(occupation.salary.asOf)}
          </span>
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          No wage data on file for this occupation. That&apos;s a gap in what we
          hold, not a statement that the work pays nothing — we&apos;d rather
          leave it blank than fill it with a stand-in figure.
        </p>
      )}

      {occupation.outlook ? (
        <OutlookLine outlook={occupation.outlook} />
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          No employment projection on file for this occupation.
        </p>
      )}
    </li>
  )
}

/**
 * One career area: the roll-up range, then the occupations behind it.
 *
 * The area-level range carries its own source and vintage — and when the
 * occupations under it disagree about either, the backend says `mixed: …` in
 * the `asOf` rather than quietly picking one. That string is printed as written.
 */
export function CareerAreaCard({ area }: { area: MarketArea }) {
  return (
    <section className="space-y-3" aria-label={area.family}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium">{area.family}</h3>
        {area.affinity !== null && (
          <Badge variant="outline">{Math.round(area.affinity)} / 100 fit</Badge>
        )}
        {area.pivotDifficulty && (
          <Badge variant="outline">{area.pivotDifficulty} pivot</Badge>
        )}
      </div>

      {area.range ? (
        <SalaryRangeCard role={area.family} range={area.range} />
      ) : (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {area.note ?? "No wage data on file for this career area yet."} We
              haven&apos;t put a figure here, because a made-up one is worse than
              an empty space — this is a gap in our data, not a claim about what
              the work pays.
            </p>
          </CardContent>
        </Card>
      )}

      {area.occupations.length > 0 && (
        <ul className="space-y-2">
          {area.occupations.map((occupation) => (
            <OccupationRow key={occupation.code} occupation={occupation} />
          ))}
        </ul>
      )}
    </section>
  )
}

/* ──────────────────────────────────────────────────────────────────────────── */

export default function SalaryPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, isFetching, refetch } = useMarketSalaries()

  const areas = data?.areas ?? []
  const priced = areas.filter((area) => area.range).length

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

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Looking up what these areas pay…
        </div>
      )}

      {isError && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              We couldn&apos;t load the pay data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              That&apos;s a fault on our side, not a sign there&apos;s nothing to
              show. Nothing you&apos;ve done has been lost, and trying again is
              safe.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden />
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {data && areas.length > 0 && (
        <section aria-labelledby="salary-ranges" className="space-y-6">
          <div>
            <h2 id="salary-ranges" className="text-sm font-medium">
              {data.ranked ? "Your career areas" : "Every career area"}
            </h2>
            {/* The provenance of the whole screen, said once and up front. The
                per-figure attribution below is not a substitute for it: a reader
                is entitled to know which dataset they are looking at before they
                read a single number off it. */}
            <p className="mt-1 text-xs text-muted-foreground">
              Figures from <span className="font-medium">{data.provider}</span>,
              vintage {formatAsOf(data.asOf)}. {priced} of {areas.length} areas
              have wage data on file.
            </p>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {data.note}
            </p>
          </div>

          {!data.ranked && (
            <Card>
              <CardContent className="space-y-3 p-4">
                <p className="text-sm text-muted-foreground">
                  These aren&apos;t ranked for you yet — that needs a behavioural
                  profile on file. They&apos;re still worth reading: this is what
                  the work pays, whoever is looking.
                </p>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(ROUTES.DIRECTION_SETTING.ESTABLISH)}
                  >
                    Start with who I am
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {areas.map((area) => (
            <CareerAreaCard key={area.family} area={area} />
          ))}
        </section>
      )}

      {data && areas.length === 0 && (
        /* Honest empty state — no example figures, not even greyed-out ones. */
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDashed
                className="h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              There&apos;s nothing to price yet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{data.note}</p>
            <p className="text-sm text-muted-foreground">
              Picking your career areas is the step this one reads from, so
              it&apos;s the useful thing to do next.
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
