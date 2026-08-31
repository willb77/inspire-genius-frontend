import React from "react"
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold"
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import { useGatedNavItems } from "@/hooks/nav/useGatedNavItems"
import { useToolsSection } from "@/hooks/nav/useToolsSection"
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

  // ONE consolidated "Tools" section, super-admin only (2026-08-12, request).
  //
  // This layout used to render TWO groups here: a collapsed "Tools" rollup from
  // TOOL_ITEMS_BY_ROLE and an expanded "Verticals" catalogue. Both are now
  // folded into useToolsSection, which returns null for manager,
  // company-admin, practitioner and distributor — the roles this layout serves
  // — so in practice those roles get the flat role menu and nothing else.
  // The per-role entries in TOOL_ITEMS_BY_ROLE are deliberately kept: they are
  // what a future "give managers their tools back" turns on, and deleting them
  // would make that a rebuild rather than a one-line gate change.
  const toolsSection = useToolsSection(role)

  const navSections: NavSectionDef[] | undefined = toolsSection
    ? [{ label: "", items: navItems }, toolsSection]
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
