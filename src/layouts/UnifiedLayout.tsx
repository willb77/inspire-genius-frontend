import React from "react"
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold"
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import { useGatedNavItems, useEntitledVerticalItems } from "@/hooks/nav/useGatedNavItems"
import { usePageViewAudit } from "@/hooks/audit/usePageViewAudit"
import type { UserRole } from "@/types/roles"

export type UnifiedLayoutProps = {
  role: UserRole
  children: React.ReactNode
  className?: string
  /** Optional path to auto-expand sidebar when navigating to this route */
  expandOnPath?: string
  /** Optional content to render after the main content area (e.g. floating components) */
  renderAfterContent?: React.ReactNode
  /**
   * Start with the nav rail collapsed (not persisted) — for content-dense
   * pages such as Meridian Chat that want the horizontal room.
   */
  collapseSidebarOnMount?: boolean
}

export default function UnifiedLayout({
  role,
  children,
  className,
  expandOnPath,
  renderAfterContent,
  collapseSidebarOnMount,
}: UnifiedLayoutProps) {
  const auditLabel = role === "user" ? "user" : role
  usePageViewAudit(auditLabel)

  // The role menu already includes entitled WORKSPACE verticals (Job Fit,
  // Lumen) — they read as first-person workspace tools, not separate products.
  const navItems = useGatedNavItems(role)
  const verticalItems = useEntitledVerticalItems(role)

  // Role menu as a header-less group at the top, with the Verticals catalogue
  // beneath it. Verticals is EXPANDED (2026-07-28) — it lists every vertical,
  // greyed where the user has no entitlement, so it is a menu to browse rather
  // than a drawer to remember to open.
  const navSections: NavSectionDef[] | undefined = verticalItems.length
    ? [
        { label: "", items: navItems },
        { label: "Verticals", items: verticalItems, defaultCollapsed: false },
      ]
    : undefined

  return (
    <SidebarScaffold
      navItems={navItems}
      navSections={navSections}
      className={className}
      expandOnPath={expandOnPath}
      renderAfterContent={renderAfterContent}
      collapseOnMount={collapseSidebarOnMount}
    >
      {children}
    </SidebarScaffold>
  )
}
