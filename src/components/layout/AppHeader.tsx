import { Search, Settings as SettingsIcon, Menu } from "lucide-react"
import { useAuth } from "@/context/useAuth"
import { useNavigate } from "react-router-dom"
import NotificationBell from "@/components/layout/NotificationBell"

type AppHeaderProps = {
  onMenuToggle: () => void
}

export default function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const displayName = user?.fullName ?? user?.name ?? user?.email ?? "User"
  const displayRole = (user?.role ?? "user").replace("-", " ")

  const handleLogoClick = () => {
    const role = user?.role ?? "user"
    if (role === "super-admin") navigate("/super-admin/dashboard")
    else if (role === "manager") navigate("/manager/dashboard")
    else if (role === "company-admin") navigate("/company-admin/dashboard")
    else if (role === "practitioner") navigate("/practitioner/dashboard")
    else if (role === "distributor") navigate("/distributor/dashboard")
    else navigate("/home")
  }

  return (
    <header role="banner" className="fixed top-0 left-0 right-0 h-[var(--spacing-header-h)] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-4 z-50">
      {/* Left */}
      <div className="flex items-center gap-2.5">
        <button onClick={onMenuToggle} className="md:hidden w-11 h-11 rounded-lg flex items-center justify-center hover:bg-[#f3f4f6]" aria-label="Menu">
          <Menu className="w-5 h-5 text-[#4b5563]" />
        </button>
        <button onClick={handleLogoClick} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" aria-label="Go to home">
          <img src="/images/logo-dark.png" alt="Inspire Genius" className="h-8 w-auto shrink-0" />
          <span className="font-bold text-[15px] text-[#111827] hidden sm:inline">Inspire Genius</span>
        </button>
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
        <NotificationBell />
        <button className="w-11 h-11 md:w-9 md:h-9 rounded-lg flex items-center justify-center hover:bg-[#f3f4f6]" aria-label="Settings" onClick={() => navigate("/settings")}>
          <SettingsIcon className="w-[18px] h-[18px] text-[#4b5563]" />
        </button>
        <button onClick={handleLogoClick} className="flex items-center gap-2 cursor-pointer px-1 py-1 rounded-lg hover:bg-[#f3f4f6]" aria-label="Go to home">
          <img src="/images/logo-dark.png" alt="Inspire Genius" className="w-9 h-9 rounded-full object-contain shrink-0" />
          <div className="leading-tight hidden lg:block text-left">
            <div className="text-[13px] font-semibold text-[#1f2937]">{displayName}</div>
            <div className="text-[11px] text-[#6b7280] capitalize">{displayRole}</div>
          </div>
        </button>
      </div>
    </header>
  )
}
