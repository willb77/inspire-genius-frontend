import { useEffect } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import { discoveryErrorMessage, useDiscoveryCost } from "@/hooks/career-discovery/useCareerDiscovery"
import type { DiscoveryCost } from "@/types/career-discovery"
import { useVerticalAccess } from "@/verticals/core"
import ComingNextPage from "./ComingNextPage"
import { costQueryFrom } from "./costQuery"
import { DiscoveryError, DiscoveryLoading, NoticeCard, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"
import { HouseCostNoQuery } from "./house/HouseCostNoQuery"
import { costSearch, rememberCost } from "./house/lastCost"
import { learningOf } from "@/lib/career-discovery/learningSection"
import { LearningButtons } from "./LearningParts"

/**
 * Cost and payback (DISC-3). The server decides whether this stage exists on
 * this tier: when its `cost` stage is not `available`, this renders the exact
 * "Coming next" page the route rendered before DISC-3. Every figure on this
 * page is the server's; nothing is computed here.
 */
export default function CostPage() {
  const { t } = useTranslation("careerDiscoveryPages")
  const { journey } = useDiscoveryContext()
  const on = journey.stages.some((s) => s.id === "cost" && s.available)
  if (!on) return <ComingNextPage stage="cost" />
  // JF-10: with the server's Learning and Education mark, the four buttons sit
  // above the page. The figures are the server's either way (/cost is unchanged).
  const learning = learningOf(journey.stages)
  if (!learning) return <CostAndPayback enabled={journey.mayProceed} />
  return (
    <div className="space-y-6">
      <LearningButtons learning={learning} current="cost" />
      <CostAndPayback enabled={journey.mayProceed} pathsLabel={t("costLearningPath", "Learning and Education Path")} />
    </div>
  )
}

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

function years(t: TFunction, n: number): string {
  if (n < 1) {
    const months = Math.max(1, Math.round(n * 12))
    return months === 1
      ? t("costAboutOneMonth", { defaultValue: "about {{months}} month", months })
      : t("costAboutMonths", { defaultValue: "about {{months}} months", months })
  }
  return t("costAboutYears", { defaultValue: "about {{years}} years", years: n.toFixed(1) })
}

function CostAndPayback({ enabled, pathsLabel }: { enabled: boolean; pathsLabel?: string }) {
  const { t } = useTranslation("careerDiscoveryPages")
  const paths = pathsLabel ?? t("costEducationPaths", "Education paths")
  const [params] = useSearchParams()
  const query = costQueryFrom(params)
  const { data, isLoading, isError, error } = useDiscoveryCost(query, enabled)
  // House style: remember this tab's last school and path, so the menu can reopen it.
  const house = isHouseStyleOn("career-education")
  const toRemember = house && query ? costSearch(query) : null
  useEffect(() => {
    if (toRemember) rememberCost(toRemember)
  }, [toRemember])
  const header = (
    <StageHeader
      title={t("costTitle", "Cost and payback")}
      lead={t(
        "costLead",
        "What a path costs at one school, against what it pays. Ranges, not promises: your own price depends on your aid."
      )}
    />
  )

  if (!query && house) {
    return (
      <div className="space-y-6">
        {header}
        <HouseCostNoQuery />
      </div>
    )
  }
  if (!query) {
    return (
      <div className="space-y-6">
        {header}
        <NoticeCard title={t("costPickSchoolTitle", "Pick a school first")}>
          <p>
            {t("costPickSchoolBody", {
              defaultValue: "Choose a path and a school on {{paths}}, then open its cost and payback.",
              paths,
            })}
          </p>
          <Link className="underline" to={ROUTES.CAREER_DISCOVERY.EDUCATION}>
            {t("costGoTo", { defaultValue: "Go to {{paths}}", paths })}
          </Link>
        </NoticeCard>
      </div>
    )
  }
  if (isLoading) return <DiscoveryLoading label={t("costLoading", "Working out cost and payback")} />
  if (isError || !data) return <DiscoveryError message={discoveryErrorMessage(error)} />

  if (data.unavailable) {
    return (
      <div className="space-y-6">
        {header}
        <NoticeCard title={t("costUnavailableTitle", "Cost figures unavailable")}>
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
  const { t } = useTranslation("careerDiscoveryPages")
  return (
    <NoticeCard title={t("costNoPaybackTitle", "No payback figure for this path")}>
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
  const { t } = useTranslation("careerDiscoveryPages")
  const { netPrice, totalCost, earnings, payback, yearsToComplete } = data
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {netPrice && totalCost && yearsToComplete ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("costWhatItCosts", "What it costs")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {t("costPerYear", {
                defaultValue: "{{low}} to {{high}} a year after grants (average {{average}}), over {{years}} years.",
                low: money(netPrice.low),
                high: money(netPrice.high),
                average: money(netPrice.average),
                years:
                  yearsToComplete.low === yearsToComplete.high
                    ? yearsToComplete.low
                    : t("costYearsRange", {
                        defaultValue: "{{low}} to {{high}}",
                        low: yearsToComplete.low,
                        high: yearsToComplete.high,
                      }),
              })}
            </p>
            <p className="font-medium">
              {t("costInAll", {
                defaultValue: "In all: {{low}} to {{high}}",
                low: money(totalCost.low),
                high: money(totalCost.high),
              })}
            </p>
            <p className="text-xs text-muted-foreground">{netPrice.note}</p>
          </CardContent>
        </Card>
      ) : null}
      {earnings ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("costWhatItPays", "What it pays")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              {earnings.basis === "program"
                ? t("costEarningsProgram", {
                    defaultValue: "Graduates of this program: {{early}} early on, {{later}} later.",
                    early: money(earnings.early),
                    later: money(earnings.later),
                  })
                : t("costEarningsJobs", {
                    defaultValue: "The jobs it leads to: {{early}} at entry to {{later}} at the median.",
                    early: money(earnings.early),
                    later: money(earnings.later),
                  })}
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
            <CardTitle className="text-base">{t("costPayback", "Payback")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">
              {!payback.reachable || payback.low === null
                ? t("costNoPayback", "At those earnings it doesn't clearly pay back.")
                : payback.high === null
                  ? t("costPaybackBestOnly", {
                      defaultValue: "{{low}} at best; at the early earnings it doesn't pay back.",
                      low: years(t, payback.low),
                    })
                  : t("costPaybackRange", {
                      defaultValue: "{{low}} to {{high}} once you are working.",
                      low: years(t, payback.low),
                      high: years(t, payback.high),
                    })}
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
  const { t } = useTranslation("careerDiscoveryPages")
  const grant = useVerticalAccess("grant")
  if (!data.aid) return null
  return (
    <NoticeCard title={t("costPayingTitle", "Paying for it")}>
      <p>{t("costPayingBody", "Grants and scholarships change what you pay. These help you find yours.")}</p>
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
              {t("costNetPriceCalc", "This school's net price calculator")}
            </a>
          </li>
        ) : null}
        <li>
          <a className="underline" href={data.aid.studentAid} target="_blank" rel="noopener noreferrer">
            {t("costFafsa", "Federal student aid (FAFSA)")}
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
