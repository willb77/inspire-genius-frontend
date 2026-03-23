import React from "react"
import { cn } from "@/lib/utils"

type DataCardProps = {
  title: string
  badge?: string | number
  children: React.ReactNode
  className?: string
}

export default function DataCard({ title, badge, children, className }: DataCardProps) {
  return (
    <div role="region" aria-label={title} className={cn("bg-white border border-[#e5e7eb] rounded-lg p-4 mt-5", className)}>
      <div className="text-[15px] font-semibold text-[#111827] mb-3.5 flex items-center gap-2">
        {title}
        {badge !== undefined && (
          <span className="bg-[#3B5BFF] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>
        )}
      </div>
      {children}
    </div>
  )
}
