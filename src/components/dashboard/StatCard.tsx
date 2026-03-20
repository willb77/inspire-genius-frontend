import type { StatCardData } from "@/types/dashboard/data-types"
import { cn } from "@/lib/utils"

export default function StatCard({ label, value, change, changeColor, icon: Icon, iconColor, iconBg }: StatCardData) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] uppercase font-semibold text-[#6b7280]">{label}</span>
        {change && (
          <span className={cn("text-[11px] font-semibold", changeColor || "text-[#10B981]")}>{change}</span>
        )}
      </div>
      <div className={cn("w-12 h-12 rounded-[10px] flex items-center justify-center mx-auto mb-2.5", iconBg)}>
        <Icon className={cn("w-[22px] h-[22px]", iconColor)} />
      </div>
      <div className="text-2xl font-bold text-[#111827] text-center">{value}</div>
    </div>
  )
}
