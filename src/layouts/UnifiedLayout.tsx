import React from "react"
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold"
import { NAV_ITEMS_BY_ROLE } from "@/constants/navigation"
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

  const navItems = NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user

  return (
    <SidebarScaffold
      navItems={navItems}
      className={className}
      expandOnPath={expandOnPath}
      renderAfterContent={renderAfterContent}
    >
      {children}
    </SidebarScaffold>
  )
}
