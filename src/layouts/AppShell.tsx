import React, { useState } from "react"
import { cn } from "@/lib/utils"
import AppHeader from "@/components/layout/AppHeader"
import AppSidebar from "@/components/layout/AppSidebar"
import RightPanel from "@/components/layout/RightPanel"
import SkipToContent from "@/components/shared/SkipToContent"
import { usePageViewAudit } from "@/hooks/audit/usePageViewAudit"
import type { UserRole } from "@/types/roles"

export type AppShellProps = {
  role: UserRole
  children: React.ReactNode
  className?: string
}

export default function AppShell({ role, children, className }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  usePageViewAudit(role)

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <SkipToContent />
      <AppHeader onMenuToggle={() => setSidebarOpen((v) => !v)} />
      <AppSidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />
      <RightPanel />

      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className={cn(
          "pt-[var(--spacing-header-h)] lg:pr-[var(--spacing-right-panel-w)]",
          "min-h-screen overflow-y-auto transition-[padding] duration-200 ease-in-out",
          sidebarCollapsed
            ? "md:pl-[var(--spacing-sidebar-collapsed-w)]"
            : "md:pl-[var(--spacing-sidebar-w)]",
          className
        )}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
