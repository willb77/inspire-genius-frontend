import React from "react"
import UnifiedLayout from "./UnifiedLayout"

export type PractitionerLayoutProps = {
  children: React.ReactNode
  className?: string
  /** Start with the nav rail collapsed (not persisted) — Meridian Chat. */
  collapseSidebarOnMount?: boolean
}

/**
 * Practitioner layout.
 *
 * Phase 1 (2026-07-22) migrated the practitioner off the legacy
 * AppShell/AppSidebar onto the standard SidebarScaffold chrome (via
 * UnifiedLayout) — the same "My Workspace / Administration" look, driven by
 * PRACTITIONER_NAV_ITEMS and entitlement-gated to practitioner + super-admin.
 * Manager/Company-admin/Distributor were migrated onto UnifiedLayout in the
 * same Phase 1 (2026-07-22) — all four non-standard roles now share the
 * standard chrome; AppShell/AppSidebar are retired pending Phase 6 deletion.
 */
export default function PractitionerLayout({
  children,
  className,
  collapseSidebarOnMount,
}: PractitionerLayoutProps) {
  return (
    <UnifiedLayout
      role="practitioner"
      className={className}
      collapseSidebarOnMount={collapseSidebarOnMount}
    >
      {children}
    </UnifiedLayout>
  )
}
