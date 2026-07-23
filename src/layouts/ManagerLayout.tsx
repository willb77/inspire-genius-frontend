import React from "react"
import UnifiedLayout from "./UnifiedLayout"

export type ManagerLayoutProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Manager layout.
 *
 * Phase 1 (completed 2026-07-22) migrated the manager off the legacy
 * AppShell/AppSidebar onto the standard SidebarScaffold chrome (via
 * UnifiedLayout) — the same "My Workspace / Administration" look, driven by
 * MANAGER_NAV_ITEMS with entitled verticals under a collapsed "Verticals"
 * section. Role/entitlement gating is unchanged (ProtectedRoute + the
 * role-agnostic useGatedNavItems/useEntitledVerticalItems hooks).
 */
export default function ManagerLayout({ children, className }: ManagerLayoutProps) {
  return (
    <UnifiedLayout role="manager" className={className}>
      {children}
    </UnifiedLayout>
  )
}
