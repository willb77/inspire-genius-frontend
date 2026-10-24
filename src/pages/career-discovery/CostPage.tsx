import { Link, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import { discoveryErrorMessage, useDiscoveryCost } from "@/hooks/career-discovery/useCareerDiscovery"
import type { DiscoveryCost } from "@/types/career-discovery"
import { useVerticalAccess } from "@/verticals/core"
import ComingNextPage from "./ComingNextPage"
import { costQueryFrom } from "./costQuery"
import { DiscoveryError, DiscoveryLoading, NoticeCard, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"

/**
 * Cost and payback (DISC-3). The server decides whether this stage exists on
 * this tier: when its `cost` stage is not `available`, this renders the exact
 * "Coming next" page the route rendered before DISC-3. Every figure on this
 * page is the server's; nothing is computed here.
 */
export default function CostPage() {
  const { journey } = useDiscoveryContext()
  const on = journey.stages.some((s) => s.id === "cost" && s.available)
  if (!on) return <ComingNextPage stage="cost" />
  return <CostAndPayback enabled={journey.mayProceed} />
}

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

function years(n: number): string {
  if (n < 1) {
    const months = Math.max(1, Math.round(n * 12))
    return `about ${months} month${months === 1 ? "" : "s"}`
  }
  return `about ${n.toFixed(1)} years`
}

function CostAndPayback({ enabled }: { enabled: boolean }) {
  const [params] = useSearchParams()
  const query = costQueryFrom(params)
  const { data, isLoading, isError, error } = useDiscoveryCost(query, enabled)
  const header = (
    <StageHeader
      title="Cost and payback"
      lead="What a path costs at one school, against what it pays. Ranges, not promises: your own price depends on your aid."
    />
  )

  if (!query) {
    return (
      <div className="space-y-6">
        {header}
        <NoticeCard title="Pick a school first">
          <p>Choose a path and a school on Education paths, then open its cost and payback.</p>
          <Link className="underline" to={ROUTES.CAREER_DISCOVERY.EDUCATION}>
            Go to Education paths
          </Link>
        </NoticeCard>
      </div>
    )
  }
  if (isLoading) return <DiscoveryLoading label="Working out cost and payback" />
  if (isError || !data) return <DiscoveryError message={discoveryErrorMessage(error)} />

  if (data.unavailable) {
    return (
      <div className="space-y-6">
        {header}
        <NoticeCard title="Cost figures unavailable">
          <p>{data.note}</p>
        </NoticeCard>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      {header}
      <p className="text-sm">
        <span className="font-medium">{data.field}</span>
        {data.credential ? ` · ${data.credential}` : ""}
        {data.school?.name ? ` · ${data.school.name}` : ""}
      </p>
      {data.computable ? <Figures data={data} /> : <Refusals data={data} />}
      <Aid data={data} />
      <Sources data={data} />
    </div>
  )
}

function Refusals({ data }: { data: DiscoveryCost }) {
  return (
    <NoticeCard title="No payback figure for this path">
      <p>{data.note}</p>
      <ul className="list-disc space-y-1 pl-5">
        {(data.missingStatements ?? []).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </NoticeCard>
  )
}

function Figures({ data }: { data: DiscoveryCost }) {
  const { netPrice, totalCost, earnings, payback, yearsToComplete } = data
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {netPrice && totalCost && yearsToComplete ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">What it costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {money(netPrice.low)} to {money(netPrice.high)} a year after grants (average {money(netPrice.average)}),
              over {yearsToComplete.low === yearsToComplete.high ? yearsToComplete.low : `${yearsToComplete.low} to ${yearsToComplete.high}`} years.
            </p>
            <p className="font-medium">
              In all: {money(totalCost.low)} to {money(totalCost.high)}
            </p>
            <p className="text-xs text-muted-foreground">{netPrice.note}</p>
          </CardContent>
        </Card>
      ) : null}
      {earnings ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">What it pays</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {earnings.basis === "program"
                ? `Graduates of this program: ${money(earnings.early)} early on, ${money(earnings.later)} later.`
                : `The jobs it leads to: ${money(earnings.early)} at entry to ${money(earnings.later)} at the median.`}
            </p>
            {earnings.label ? (
              <p className="rounded-md border border-dashed p-2 text-xs" data-testid="approximation-label">
                {earnings.label}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      {payback ? (
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">
              {!payback.reachable || payback.low === null
                ? "At those earnings it doesn't clearly pay back."
                : payback.high === null
                  ? `${years(payback.low)} at best; at the early earnings it doesn't pay back.`
                  : `${years(payback.low)} to ${years(payback.high)} once you are working.`}
            </p>
            {data.statement ? <p>{data.statement}</p> : null}
            <p className="text-xs text-muted-foreground">{payback.note}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Aid({ data }: { data: DiscoveryCost }) {
  const grant = useVerticalAccess("grant")
  if (!data.aid) return null
  return (
    <NoticeCard title="Paying for it">
      <p>Grants and scholarships change what you pay. These help you find yours.</p>
      <ul className="space-y-1">
        {grant.hasAccess ? (
          <li>
            <Link className="underline" to={data.aid.grant.path}>
              {data.aid.grant.label}
            </Link>
          </li>
        ) : null}
        {data.aid.netPriceCalculator ? (
          <li>
            <a className="underline" href={data.aid.netPriceCalculator} target="_blank" rel="noopener noreferrer">
              This school&apos;s net price calculator
            </a>
          </li>
        ) : null}
        <li>
          <a className="underline" href={data.aid.studentAid} target="_blank" rel="noopener noreferrer">
            Federal student aid (FAFSA)
          </a>
        </li>
      </ul>
    </NoticeCard>
  )
}

function Sources({ data }: { data: DiscoveryCost }) {
  const lines = [
    data.netPrice?.source,
    data.yearsToComplete?.source,
    data.earnings?.source,
    data.baseline?.source,
  ].filter((s): s is string => Boolean(s))
  if (lines.length === 0) return null
  return (
    <div className="max-w-3xl space-y-1 text-xs text-muted-foreground">
      {lines.map((s) => (
        <p key={s}>{s}</p>
      ))}
    </div>
  )
}
