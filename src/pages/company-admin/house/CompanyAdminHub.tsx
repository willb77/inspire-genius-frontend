import React from "react"
import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import { PageHeader } from "@/components/shared/house/PageHeader"
import { useCohortReadoutEnabled } from "@/hooks/company-admin/useCohortReadout"
import { cn } from "@/lib/utils"
import { type CompanyAdminHubDef, visibleHubTabs } from "./hubs"

/**
 * RM-5 (2026-11-26) — a company-admin "one page with tabs", the company-admin
 * counterpart of the super-admin `AdminHub`.
 *
 * The page that owns a route renders <CompanyAdminHub> around its own content
 * when isHouseStyleOn("company-admin") is true, and renders itself unchanged
 * otherwise. Each tab IS an existing route, so every address keeps working and
 * opens its own tab; no route is added, removed or redirected.
 *
 * A cohort-gated tab (Cohort Read-out) shows only while the org's switch reads
 * true, from the same query the menu used for its row, so it adds no request.
 * Display only: the server still refuses every cohort read while the switch is
 * off, whatever this component shows.
 */
export interface CompanyAdminHubProps {
  hub: CompanyAdminHubDef
  /** Key of the tab whose page is rendering. */
  active: string
  /** At most one main button, shown on the right of the header. */
  action?: React.ReactNode
  children: React.ReactNode
}

export function CompanyAdminHub({ hub, active, action, children }: CompanyAdminHubProps) {
  const { t } = useTranslation("companyAdminPages")
  const { pathname } = useLocation()
  const cohort = useCohortReadoutEnabled(hub.tabs.some((tab) => tab.cohortGated))
  const tabs = visibleHubTabs(hub, cohort.data === true)
  const current = tabs.find((tab) => tab.key === active)
  const title = t(hub.titleKey, { defaultValue: hub.title })

  return (
    <CompanyAdminLayout>
      <PageHeader
        title={title}
        description={t(hub.descriptionKey, { defaultValue: hub.description })}
        action={action}
        className="mb-2"
      />
      <nav
        aria-label={t("hubSectionsLabel", { defaultValue: "{{title}} sections", title })}
        className="mb-4 flex flex-wrap gap-1 border-b border-border"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === active
          return (
            <Link
              key={tab.key}
              to={isActive ? pathname : tab.to}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(tab.labelKey, { defaultValue: tab.label })}
            </Link>
          )
        })}
      </nav>
      {current && (
        <p className="mb-4 text-sm text-muted-foreground">
          {t(current.descriptionKey, { defaultValue: current.description })}
        </p>
      )}
      <div>{children}</div>
    </CompanyAdminLayout>
  )
}

export default CompanyAdminHub
