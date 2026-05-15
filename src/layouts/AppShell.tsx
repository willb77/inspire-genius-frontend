import React, { useState } from "react"
import { cn } from "@/lib/utils"
import AppHeader from "@/components/layout/AppHeader"
import AppSidebar from "@/components/layout/AppSidebar"
import RightPanel from "@/components/layout/RightPanel"
import SkipToContent from "@/components/shared/SkipToContent"
import { EcosystemStatusBanner } from "@/components/shared/EcosystemStatusBanner"
import { SystemSwitch } from "@/components/shared/SystemSwitch"
import { usePageViewAudit } from "@/hooks/audit/usePageViewAudit"
import { useAuth } from "@/context/useAuth"
import type { UserRole } from "@/types/roles"
import { isUserRole } from "@/types/roles"

export type AppShellProps = {
  role: UserRole
  children: React.ReactNode
  className?: string
}

export default function AppShell({ role, children, className }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user } = useAuth()
  // Super-admin sees all sidebar sections regardless of which role page they're viewing
  const actualRole = user?.role === "super-admin" ? "super-admin" : role
  const sidebarRole = isUserRole(actualRole) ? actualRole : role
  usePageViewAudit(role)

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <SkipToContent />
      <AppHeader onMenuToggle={() => setSidebarOpen((v) => !v)} />
      <EcosystemStatusBanner />
      {/* Phase C item 4: explicit per-conversation system override (super-admin only). */}
      {user?.role === "super-admin" && (
        <div className="fixed right-4 top-[calc(var(--spacing-header-h)+0.5rem)] z-30 hidden md:block">
          <SystemSwitch />
        </div>
      )}
      <AppSidebar
        role={sidebarRole}
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
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}
