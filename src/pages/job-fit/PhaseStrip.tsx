import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { cn } from "@/lib/utils"
import { useVerticalAccess } from "@/verticals/core"
import { useCareersJobsFlow } from "@/hooks/careers-jobs/useCareersJobsFlow"
import { phaseItems, type PhaseItem, type PhaseKey, type PhaseVertical } from "@/lib/careers-jobs/phases"

/**
 * Careers and Jobs Phase B — the phase strip drawn above the Discovery and
 * Careers and Jobs shells' own navs.
 *
 * Renders `null` — no wrapper, no spinner — unless the `careers_jobs_flow`
 * switch says `true` for this person, so with the switch off (or loading, or
 * failing) both shells are exactly today's page. The existing navs are not
 * touched.
 *
 * CSA: docs/analysis/2026-11-24-careers-jobs-phase-b-design-csa.md (monorepo).
 */
export function CareersJobsPhaseStrip() {
  const on = useCareersJobsFlow()
  if (!on) return null
  return <PhaseStrip />
}

/** The strip itself. Mounted only when the switch is on. */
export function PhaseStrip() {
  const { pathname } = useLocation()
  const discovery = useVerticalAccess("career-discovery")
  const jobFit = useVerticalAccess("job-fit")
  const entitled = new Set<PhaseVertical>()
  if (discovery.hasAccess) entitled.add("career-discovery")
  if (jobFit.hasAccess) entitled.add("job-fit")

  const items = phaseItems(entitled, pathname)
  if (items.length === 0) return null
  return <PhaseStripView items={items} />
}

/** Literal keys, so the jobFitPages i18n guard sees every one (no template keys). */
function phaseLabel(t: TFunction, key: PhaseKey): string {
  switch (key) {
    case "knowYourself":
      return t("phaseStrip.knowYourself", "Know yourself")
    case "exploreCareers":
      return t("phaseStrip.exploreCareers", "Explore careers")
    case "checkTheFit":
      return t("phaseStrip.checkTheFit", "Check the fit")
    case "planTheRoute":
      return t("phaseStrip.planTheRoute", "Plan the route")
  }
}

function PhaseStripView({ items }: { items: PhaseItem[] }) {
  const { t } = useTranslation("jobFitPages")
  const total = items.length
  return (
    <nav aria-label={t("phaseStrip.label", "Your Careers and Jobs journey")} className="mb-4">
      <ol className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <li key={item.key}>
            <Link
              to={item.to}
              aria-current={item.current ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                item.current
                  ? "border-primary bg-primary text-primary-foreground font-medium"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                  item.current ? "bg-primary-foreground/20" : "bg-muted"
                )}
              >
                {i + 1}
              </span>
              <span className="sr-only">
                {t("phaseStrip.stepOf", { defaultValue: "Step {{n}} of {{total}}", n: i + 1, total })}
                {": "}
              </span>
              {phaseLabel(t, item.key)}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  )
}
