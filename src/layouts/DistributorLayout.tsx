import React from "react"
import UnifiedLayout from "./UnifiedLayout"

export type DistributorLayoutProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Distributor layout.
 *
 * Phase 1 (completed 2026-07-22) migrated the distributor off the legacy
 * AppShell/AppSidebar onto the standard SidebarScaffold chrome (via
 * UnifiedLayout) — the same "My Workspace / Administration" look, driven by
 * DISTRIBUTOR_NAV_ITEMS with entitled verticals under a collapsed "Verticals"
 * section. Role/entitlement gating is unchanged.
 */
export default function DistributorLayout({ children, className }: DistributorLayoutProps) {
  return (
    <UnifiedLayout role="distributor" className={className}>
      {children}
    </UnifiedLayout>
  )
}
