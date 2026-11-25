import React from "react"
import { cn } from "@/lib/utils"

type DataCardProps = {
  title: React.ReactNode
  /** The region's accessible name when `title` is not a plain string (for example PRISM, which is italic). */
  ariaLabel?: string
  badge?: string | number
  children: React.ReactNode
  className?: string
}

export default function DataCard({ title, ariaLabel, badge, children, className }: DataCardProps) {
  return (
    <div role="region" aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)} className={cn("bg-white border border-[#e5e7eb] rounded-lg p-4 mt-5", className)}>
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
