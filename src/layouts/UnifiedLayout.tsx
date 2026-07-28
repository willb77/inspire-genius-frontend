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
}

export default function UnifiedLayout({
  role,
  children,
  className,
  expandOnPath,
  renderAfterContent,
}: UnifiedLayoutProps) {
  const auditLabel = role === "user" ? "user" : role
  usePageViewAudit(auditLabel)

  // The role menu already includes entitled WORKSPACE verticals (Job Fit,
  // Lumen) — they read as first-person workspace tools, not separate products.
  const navItems = useGatedNavItems(role)
  const verticalItems = useEntitledVerticalItems(role)

  // When the user is entitled to launcher verticals, render the role menu as a
  // header-less group at the top with a COLLAPSED "Verticals" section beneath;
  // otherwise just the flat role menu.
  const navSections: NavSectionDef[] | undefined = verticalItems.length
    ? [
        { label: "", items: navItems },
        { label: "Verticals", items: verticalItems, defaultCollapsed: true },
      ]
    : undefined

  return (
    <SidebarScaffold
      navItems={navItems}
      navSections={navSections}
      className={className}
      expandOnPath={expandOnPath}
      renderAfterContent={renderAfterContent}
    >
      {children}
    </SidebarScaffold>
  )
}
