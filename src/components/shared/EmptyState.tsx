import React from "react"
import { Inbox } from "lucide-react"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
  title?: string
  message?: string
  action?: React.ReactNode
  className?: string
}

export default function EmptyState({
  title = "No data yet",
  message = "There's nothing to show here right now.",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="w-12 h-12 rounded-full bg-[#f3f4f6] flex items-center justify-center mb-3">
        <Inbox className="w-6 h-6 text-[#9ca3af]" />
      </div>
      <h3 className="text-[15px] font-semibold text-[#374151] mb-1">{title}</h3>
      <p className="text-[13px] text-[#9ca3af] max-w-xs mb-4">{message}</p>
      {action}
    </div>
  )
}
