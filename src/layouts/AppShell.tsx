import React, { useState } from "react"
import { cn } from "@/lib/utils"
import AppHeader from "@/components/layout/AppHeader"
import AppSidebar from "@/components/layout/AppSidebar"
import RightPanel from "@/components/layout/RightPanel"
import { usePageViewAudit } from "@/hooks/audit/usePageViewAudit"
import type { UserRole } from "@/types/roles"

export type AppShellProps = {
  role: UserRole
  children: React.ReactNode
  className?: string
}

export default function AppShell({ role, children, className }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  usePageViewAudit(role)

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <AppHeader onMenuToggle={() => setSidebarOpen((v) => !v)} />
      <AppSidebar role={role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <RightPanel />

      <main
        className={cn(
          "pt-[var(--spacing-header-h)] md:pl-[var(--spacing-sidebar-w)] lg:pr-[var(--spacing-right-panel-w)]",
          "min-h-screen overflow-y-auto",
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
