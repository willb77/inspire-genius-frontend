import React, { useMemo } from "react"
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold"
import type { NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import { frameSections, useRoleMenuFrame } from "@/hooks/nav/useGatedNavItems"
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

  // RM-4 (2026-11-25): manager, company admin, practitioner and distributor get
  // the shared frame — own work, My Workspace (not distributor), Tools (manager
  // and practitioner), and a Settings / Help & Support footer. Any other role
  // (user, super-admin) keeps the menu it had: its own list, plus Tools when
  // the role has one.
  const frame = useRoleMenuFrame(role)
  const navItems = frame.own
  const navSections: NavSectionDef[] | undefined = useMemo(
    () => frameSections(frame) ?? (frame.tools ? [{ label: "", items: navItems }, frame.tools] : undefined),
    [frame, navItems],
  )

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
