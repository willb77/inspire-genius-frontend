import React from "react"
import { Link, useLocation } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { PageHeader } from "@/components/shared/house/PageHeader"
import type { HubDef } from "./hubs"
import { cn } from "@/lib/utils"

/**
 * House-style "one page with tabs" for Administration (Wave 1, admin switch).
 *
 * Several super-admin pages that do one job between them are shown as one page
 * whose tabs are the existing pages. Each tab IS an existing route, so:
 *   - every address that works today keeps working and deep-links to its tab;
 *   - no route is added, removed or redirected;
 *   - only the open tab's page loads its data, exactly as visiting it does today.
 *
 * The page that owns the route renders <AdminHub> around its own content when
 * isHouseStyleOn("admin") is true, and renders itself unchanged otherwise.
 */

export interface AdminHubProps {
  hub: HubDef
  /** Key of the tab whose page is rendering. */
  active: string
  /** At most one main button, shown on the right of the header. */
  action?: React.ReactNode
  children: React.ReactNode
}

export function AdminHub({ hub, active, action, children }: AdminHubProps) {
  const { pathname } = useLocation()
  const current = hub.tabs.find((t) => t.key === active)

  return (
    <SuperAdminLayout>
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <PageHeader title={hub.title} description={hub.description} action={action} className="mb-2" />
        <nav aria-label={`${hub.title} sections`} className="flex flex-wrap gap-1 border-b border-border">
          {hub.tabs.map((t) => {
            const isActive = t.key === active
            return (
              <Link
                key={t.key}
                // The open tab points at the address being shown, so a tab
                // whose page needs a parameter (one coach's costs) stays put.
                to={isActive ? pathname : t.to}
                aria-current={isActive ? "page" : undefined}
                title={isActive ? undefined : t.hint}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
        {current && <p className="text-sm text-muted-foreground">{current.description}</p>}
        <div>{children}</div>
      </div>
    </SuperAdminLayout>
  )
}
