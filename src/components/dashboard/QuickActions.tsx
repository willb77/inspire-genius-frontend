import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"

type DateMode = "day" | "month" | "range"

type QuickAction = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  to: string
  bg: string
  iconColor: string
  /**
   * Optional route state forwarded to react-router on navigation.
   * Used e.g. by the "Chat with Meridian" action to pass
   * `{ autoLoadPrism: true }` so MeridianChat auto-attaches the
   * user's most recent PRISM CSV on mount.
   */
  state?: Record<string, unknown>
}

type QuickActionsProps = {
  actions: QuickAction[]
}

function formatDate(d: Date): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
  return `${days[d.getDay()]}, ${months[d.getMonth()]}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`
}

export default function QuickActions({ actions }: QuickActionsProps) {
  const navigate = useNavigate()
  const [dateMode, setDateMode] = useState<DateMode>("day")
  const today = new Date()

  return (
    <div className="mt-5">
      {/* Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="text-xs sm:text-[13px] font-semibold text-[#111827]">
          Quick Actions — <span className="text-[#3B5BFF]">{formatDate(today)}</span>
        </div>
        <div className="flex rounded-lg border border-[#e5e7eb] overflow-hidden">
          {(["day", "month", "range"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setDateMode(m)}
              className={cn(
                "px-3 py-1 text-[11px] font-semibold capitalize transition-colors",
                dateMode === m ? "bg-[#3B5BFF] text-white" : "bg-white text-[#374151] hover:bg-[#f3f4f6]"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Action Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((a) => {
          const Icon = a.icon
          return (
            <button
              key={a.label}
              onClick={() => navigate(a.to, a.state ? { state: a.state } : undefined)}
              className="bg-white border border-[#e5e7eb] rounded-lg p-3 sm:p-4 text-center cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all min-h-[44px]"
            >
              <div className={cn("w-10 h-10 rounded-[10px] flex items-center justify-center mx-auto mb-2", a.bg)}>
                <Icon className={cn("w-5 h-5", a.iconColor)} />
              </div>
              <div className="text-xs sm:text-[13px] font-semibold text-[#1f2937]">{a.label}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
