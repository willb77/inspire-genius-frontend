import React from "react"
import { cn } from "@/lib/utils"
import WelcomeBanner from "./WelcomeBanner"

type DashboardFrameProps = {
  title: string
  subtitle: string
  /** Optional KPI strip — typically <DashboardFrame.KpiStrip>...</DashboardFrame.KpiStrip>. */
  kpis?: React.ReactNode
  /** Welcome-banner CTAs / inline children rendered inside the gradient banner. */
  bannerActions?: React.ReactNode
  /** Main 2-column grid content (DataCards, charts, etc). Spans 2/3 of the desktop grid. */
  primary: React.ReactNode
  /** Side rail content. Spans 1/3 of the desktop grid; stacks below `primary` on mobile/tablet. */
  side?: React.ReactNode
  className?: string
}

type KpiStripProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Responsive 4-up StatCard arrangement.
 *
 * - Mobile (<sm): single column (cards stack)
 * - Tablet (sm–lg): 2x2 grid
 * - Desktop (lg+): 1x4 row
 */
function KpiStrip({ children, className }: KpiStripProps) {
  return (
    <div
      role="list"
      aria-label="Key performance indicators"
      className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5", className)}
    >
      {React.Children.map(children, (child, idx) => (
        <div role="listitem" key={idx}>
          {child}
        </div>
      ))}
    </div>
  )
}

/**
 * Shared structural layout for every role's Dashboard.tsx.
 *
 * Slot contract:
 * - `title` / `subtitle` → rendered inside <WelcomeBanner/>
 * - `kpis`               → KPI strip (use <DashboardFrame.KpiStrip/> for the standard 4-up arrangement)
 * - `primary`            → main content area (2/3 width on desktop). Consumer composes <DataCard/> children.
 * - `side`               → optional side rail (1/3 width on desktop, stacks below primary on smaller screens).
 *
 * Wave 1 Lane 1.E will adopt this in all 6 role dashboards.
 */
function DashboardFrame({
  title,
  subtitle,
  kpis,
  bannerActions,
  primary,
  side,
  className,
}: DashboardFrameProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <WelcomeBanner title={title} subtitle={subtitle}>
        {bannerActions}
      </WelcomeBanner>

      {kpis && <section aria-label="Dashboard KPIs">{kpis}</section>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section
          aria-label="Primary dashboard content"
          className={cn("space-y-5", side ? "lg:col-span-2" : "lg:col-span-3")}
        >
          {primary}
        </section>
        {side && (
          <aside aria-label="Side rail" className="lg:col-span-1 space-y-5">
            {side}
          </aside>
        )}
      </div>
    </div>
  )
}

DashboardFrame.KpiStrip = KpiStrip

export default DashboardFrame
export { KpiStrip as DashboardFrameKpiStrip }
export type { DashboardFrameProps, KpiStripProps }
