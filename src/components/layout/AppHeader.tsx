import { Search, Bell, Settings as SettingsIcon, Menu } from "lucide-react"
import { useAuth } from "@/context/useAuth"

type AppHeaderProps = {
  onMenuToggle: () => void
}

function getInitials(name: string | null | undefined, email: string | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase()
  }
  return (email?.[0] ?? "U").toUpperCase()
}

export default function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { user } = useAuth()
  const initials = getInitials(user?.fullName ?? user?.name, user?.email)
  const displayName = user?.fullName ?? user?.name ?? user?.email ?? "User"
  const displayRole = (user?.role ?? "user").replace("-", " ")

  return (
    <header role="banner" className="fixed top-0 left-0 right-0 h-[var(--spacing-header-h)] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-4 z-50">
      {/* Left */}
      <div className="flex items-center gap-2.5">
        <button onClick={onMenuToggle} className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#f3f4f6]" aria-label="Menu">
          <Menu className="w-5 h-5 text-[#4b5563]" />
        </button>
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#3B5BFF] to-[#2DD4BF] flex items-center justify-center text-white font-extrabold text-[13px] shrink-0">
          IG
        </div>
        <span className="font-bold text-[15px] text-[#111827] hidden sm:inline">Inspire Genius</span>
      </div>

      {/* Center — Search */}
      <div className="flex-1 flex justify-center px-6 max-w-md mx-auto hidden sm:flex">
        <div className="flex items-center gap-2 bg-[#f3f4f6] rounded-lg px-3 h-9 w-full max-w-[360px]">
          <Search className="w-4 h-4 text-[#9ca3af] shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            className="border-none bg-transparent outline-none text-[13px] text-[#374151] w-full placeholder:text-[#9ca3af]"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 rounded-lg flex items-center justify-center relative hover:bg-[#f3f4f6]" aria-label="Notifications">
          <Bell className="w-[18px] h-[18px] text-[#4b5563]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EF4444] border-2 border-white" />
        </button>
        <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#f3f4f6]" aria-label="Settings">
          <SettingsIcon className="w-[18px] h-[18px] text-[#4b5563]" />
        </button>
        <div className="flex items-center gap-2 cursor-pointer px-1 py-1 rounded-lg hover:bg-[#f3f4f6]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#3B5BFF] to-[#2DD4BF] flex items-center justify-center text-white font-bold text-[13px] shrink-0">
            {initials}
          </div>
          <div className="leading-tight hidden lg:block">
            <div className="text-[13px] font-semibold text-[#1f2937]">{displayName}</div>
            <div className="text-[11px] text-[#6b7280] capitalize">{displayRole}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
