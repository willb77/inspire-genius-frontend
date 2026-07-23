import React from "react"
import UnifiedLayout from "./UnifiedLayout"

export type CompanyAdminLayoutProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Company-admin layout.
 *
 * Phase 1 (completed 2026-07-22) migrated company-admin off the legacy
 * AppShell/AppSidebar onto the standard SidebarScaffold chrome (via
 * UnifiedLayout) — the same "My Workspace / Administration" look, driven by
 * COMPANY_ADMIN_NAV_ITEMS with entitled verticals under a collapsed
 * "Verticals" section. Role/entitlement gating is unchanged.
 */
export default function CompanyAdminLayout({ children, className }: CompanyAdminLayoutProps) {
  return (
    <UnifiedLayout role="company-admin" className={className}>
      {children}
    </UnifiedLayout>
  )
}
