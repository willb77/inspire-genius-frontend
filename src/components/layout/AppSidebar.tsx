import { useNavigate, useLocation } from "react-router-dom"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/useAuth"
import { getSectionsForRole, type SidebarNavItem } from "@/constants/sidebar-sections"
import type { UserRole } from "@/types/roles"

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
}

export default function AppSidebar({ role, open, onClose }: AppSidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const sections = getSectionsForRole(role)
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
        <div className="fixed inset-0 bg-black/30 z-[90] md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed top-[var(--spacing-header-h)] bottom-0 w-[var(--spacing-sidebar-w)] bg-white border-r border-[#e5e7eb] overflow-y-auto flex flex-col z-[100]",
          "scrollbar-thin scrollbar-thumb-[#e5e7eb]",
          // Desktop: always visible
          "hidden md:flex",
          // Mobile: overlay
          open && "!flex md:flex left-0",
          !open && "md:flex"
        )}
      >
        <nav className="flex-1 py-3 px-0">
          {sections.map((section) => (
            <div key={section.id} className="mb-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] px-4 py-1 mb-0.5">
                {section.label}
              </div>
              {section.items.map((item: SidebarNavItem) => {
                const Icon = item.icon
                const isActive = location.pathname === item.to
                return (
                  <button
                    key={item.to + item.label}
                    onClick={() => handleNav(item.to)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-[5px] mx-2 rounded-md text-[13px] border-l-2 border-transparent transition-all text-left",
                      isActive
                        ? "bg-[rgba(59,91,255,0.15)] border-l-[#3B5BFF] text-[#3B5BFF] font-semibold"
                        : "text-[#374151] hover:bg-[rgba(59,91,255,0.1)]"
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
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B5BFF] to-[#2DD4BF] flex items-center justify-center text-white font-bold text-[10px] shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-xs font-semibold text-[#1f2937] truncate">{displayName}</div>
            <div className="text-[10px] text-[#6b7280] capitalize">{displayRole}</div>
          </div>
          <button onClick={logout} className="shrink-0 p-1 rounded hover:bg-[#f3f4f6]" title="Log out">
            <LogOut className="w-4 h-4 text-[#6b7280]" />
          </button>
        </div>
      </aside>
    </>
  )
}
