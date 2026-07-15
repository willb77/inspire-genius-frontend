import { useNavigate, useLocation } from "react-router-dom"
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/useAuth"
import { getSectionsForRole, grantSidebarSectionForRole, BROADCAST_SIDEBAR_SECTION, type SidebarNavItem } from "@/constants/sidebar-sections"
import type { UserRole } from "@/types/roles"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useVerticalAccess } from "@/hooks/grant/useVerticalAccess"
import { useBroadcastAccess } from "@/hooks/super-admin/useBroadcast"

function getInitials(name: string | null | undefined, email: string | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase()
  }
  return (email?.[0] ?? "U").toUpperCase()
}

type AppSidebarProps = {
  role: UserRole
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

export default function AppSidebar({ role, open, onClose, collapsed, onToggleCollapse }: AppSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { hasAccess: hasGrantAccess } = useVerticalAccess("grant")
  const { data: broadcastAccess } = useBroadcastAccess()
  // Entitlement/access-gated sections are appended after the role-based ones.
  // They render through the same light chrome — no restyling.
  const sections = [
    ...getSectionsForRole(role),
    ...(hasGrantAccess ? [grantSidebarSectionForRole(role)] : []),
    ...(broadcastAccess?.authorized ? [BROADCAST_SIDEBAR_SECTION] : []),
  ]
  const initials = getInitials(user?.fullName ?? user?.name, user?.email)
  const displayName = user?.fullName ?? user?.name ?? user?.email ?? "User"
  const displayRole = (user?.role ?? "user").replace("-", " ")

  function handleNav(to: string) {
    navigate(to)
    onClose()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-[90] md:hidden" onClick={onClose} aria-hidden="true" />
      )}

      <aside
        role="navigation"
        aria-label="Sidebar navigation"
        className={cn(
          "fixed top-[var(--spacing-header-h)] bottom-0 bg-white border-r border-[#e5e7eb] overflow-y-auto flex flex-col z-[100]",
          "scrollbar-thin scrollbar-thumb-[#e5e7eb]",
          "transition-[width] duration-200 ease-in-out",
          // Desktop: always visible, width depends on collapsed state
          "hidden md:flex",
          collapsed ? "md:w-[var(--spacing-sidebar-collapsed-w)]" : "md:w-[var(--spacing-sidebar-w)]",
          // Mobile: full width overlay
          open && "!flex !w-[var(--spacing-sidebar-w)] md:flex left-0",
          !open && "md:flex"
        )}
      >
        {/* Desktop collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "hidden md:flex items-center justify-center",
            "absolute -right-3 top-4 z-[110]",
            "w-6 h-6 rounded-full bg-white border border-[#e5e7eb] shadow-sm",
            "hover:bg-[#f3f4f6] hover:shadow transition-colors"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-[#6b7280]" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5 text-[#6b7280]" />
          )}
        </button>

        <nav className="flex-1 py-3 px-0">
          {sections.map((section) => (
            <div key={section.id} className="mb-3">
              {!collapsed && (
                <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] px-4 py-1 mb-0.5">
                  {section.label}
                </div>
              )}
              {collapsed && (
                <div className="h-px bg-[#e5e7eb] mx-2 my-2" />
              )}
              {section.items.map((item: SidebarNavItem) => {
                const Icon = item.icon
                const isActive = location.pathname === item.to

                if (collapsed) {
                  return (
                    <Tooltip key={item.to + item.label}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleNav(item.to)}
                          className={cn(
                            "w-full flex items-center justify-center py-2 min-h-[36px] mx-auto transition-all",
                            isActive
                              ? "text-accent-orange-dark"
                              : "text-[#374151] hover:bg-accent-orange/[0.07]"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          {item.badge !== undefined && (
                            <span className="absolute top-0 right-1 bg-[#EF4444] text-white text-[8px] font-semibold w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return (
                  <button
                    key={item.to + item.label}
                    onClick={() => handleNav(item.to)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-[5px] md:py-[5px] min-h-[44px] md:min-h-0 mx-2 rounded-md text-[13px] border-l-2 border-transparent transition-all text-left",
                      isActive
                        ? "bg-accent-orange/10 border-l-accent-orange text-ink font-semibold"
                        : "text-[#374151] hover:bg-accent-orange/[0.07]"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="ml-auto bg-[#EF4444] text-white text-[10px] font-semibold px-1.5 py-px rounded-full leading-normal">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-[#e5e7eb] p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ink to-accent-orange flex items-center justify-center text-white font-bold text-[10px] shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 leading-tight">
                <div className="text-xs font-semibold text-[#1f2937] truncate">{displayName}</div>
                <div className="text-[10px] text-[#6b7280] capitalize">{displayRole}</div>
              </div>
              <button onClick={logout} className="shrink-0 p-1 rounded hover:bg-[#f3f4f6]" title="Log out">
                <LogOut className="w-4 h-4 text-[#6b7280]" />
              </button>
            </>
          )}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={logout} className="sr-only" title="Log out">
                  <LogOut className="w-4 h-4 text-[#6b7280]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Log out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </>
  )
}
