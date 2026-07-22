import React from "react"
import UnifiedLayout from "./UnifiedLayout"

export type PractitionerLayoutProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Practitioner layout.
 *
 * Phase 1 (2026-07-22) migrated the practitioner off the legacy
 * AppShell/AppSidebar onto the standard SidebarScaffold chrome (via
 * UnifiedLayout) — the same "My Workspace / Administration" look, driven by
 * PRACTITIONER_NAV_ITEMS and entitlement-gated to practitioner + super-admin.
 * Manager/Company-admin/Distributor still use AppShell until their own
 * migration (intentionally left untouched by this scoped change).
 */
export default function PractitionerLayout({ children, className }: PractitionerLayoutProps) {
  return (
    <UnifiedLayout role="practitioner" className={className}>
      {children}
    </UnifiedLayout>
  )
}
