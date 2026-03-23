import { useAuth } from "@/context/useAuth"
import PRISMPills from "@/components/dashboard/PRISMPills"
import type { PRISMDimension, UpcomingEvent } from "@/types/dashboard/data-types"

function getInitials(name: string | null | undefined, email: string | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase()
  }
  return (email?.[0] ?? "U").toUpperCase()
}

const DEFAULT_PRISM: PRISMDimension[] = [
  { label: "Gold", value: 72, bg: "#FEF2F2", color: "#E53E3E" },
  { label: "Green", value: 85, bg: "#ECFDF5", color: "#38A169" },
  { label: "Yellow", value: 58, bg: "#FEFCE8", color: "#b7791f" },
  { label: "Blue", value: 64, bg: "#EFF6FF", color: "#3182CE" },
]

const DEFAULT_UPCOMING: UpcomingEvent[] = [
  { id: "1", title: "Coaching Session", time: "Today, 2:00 PM", color: "#3B5BFF" },
  { id: "2", title: "Team Workshop", time: "Tomorrow, 10:00 AM", color: "#2DD4BF" },
  { id: "3", title: "PRISM Review", time: "Friday, 3:00 PM", color: "#8B5CF6" },
]

type RightPanelProps = {
  prism?: PRISMDimension[]
  upcoming?: UpcomingEvent[]
}

export default function RightPanel({ prism = DEFAULT_PRISM, upcoming = DEFAULT_UPCOMING }: RightPanelProps) {
  const { user } = useAuth()
  const initials = getInitials(user?.fullName ?? user?.name, user?.email)
  const displayName = user?.fullName ?? user?.name ?? user?.email ?? "User"
  const displayRole = (user?.role ?? "user").replace("-", " ")
  const displayEmail = user?.email ?? ""

  return (
    <aside role="complementary" aria-label="User profile and upcoming events" className="hidden lg:flex fixed top-[var(--spacing-header-h)] right-0 bottom-0 w-[var(--spacing-right-panel-w)] bg-white border-l border-[#e5e7eb] overflow-y-auto flex-col gap-5 p-4">
      {/* Profile */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#3B5BFF] to-[#2DD4BF] flex items-center justify-center text-white font-bold text-xl mx-auto mb-2">
          {initials}
        </div>
        <div className="text-sm font-bold text-[#111827]">{displayName}</div>
        <div className="text-xs text-[#6b7280] capitalize">{displayRole}</div>
        <div className="text-[11px] text-[#9ca3af] mt-0.5">{displayEmail}</div>
      </div>

      {/* PRISM Profile */}
      <div>
        <div className="text-xs font-semibold text-[#374151] mb-2">PRISM Profile</div>
        <PRISMPills dimensions={prism} />
      </div>

      {/* Upcoming */}
      <div>
        <div className="text-xs font-semibold text-[#374151] mb-2">Upcoming</div>
        {upcoming.map((event) => (
          <div key={event.id} className="flex gap-2.5 py-2 border-b border-[#f3f4f6] last:border-b-0">
            <div className="w-[3px] rounded self-stretch shrink-0" style={{ backgroundColor: event.color }} />
            <div>
              <div className="text-xs font-semibold text-[#1f2937]">{event.title}</div>
              <div className="text-[11px] text-[#9ca3af]">{event.time}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
