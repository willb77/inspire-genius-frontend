// GRANT vertical — shared UI primitives (UI-2..7).
//
// Component-only module (pure formatting helpers live in ./_format) so the
// react-refresh/only-export-components rule stays satisfied. These give every
// GRANT tool page the same light-theme header, card chrome, and pills.

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/** Standard page header: icon chip + title + subtitle, matching the dashboard. */
export function GrantPageHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon
  title: string
  description: string
}) {
  return (
    <div className="mb-6">
      <div className="mb-1 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(59,91,255,0.1)]">
          <Icon className="h-5 w-5 text-[#3B5BFF]" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1f2937]">{title}</h1>
      </div>
      <p className="text-[#6b7280]">{description}</p>
    </div>
  )
}

/** White surface card with the shared border + radius. */
export function GrantCard({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("rounded-xl border border-[#e5e7eb] bg-white p-5", className)}>{children}</div>
  )
}

/** Dashed empty-state panel used when a tool has no data yet. */
export function GrantEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-white p-10 text-center text-[#9ca3af]">
      {children}
    </div>
  )
}

type Tone = "blue" | "teal" | "amber" | "red" | "gray" | "green"

const TONE_CLASSES: Record<Tone, string> = {
  blue: "bg-[rgba(59,91,255,0.1)] text-[#3B5BFF]",
  teal: "bg-[rgba(45,212,191,0.14)] text-[#0f766e]",
  green: "bg-[rgba(34,197,94,0.12)] text-[#15803d]",
  amber: "bg-[rgba(245,158,11,0.14)] text-[#b45309]",
  red: "bg-[rgba(239,68,68,0.12)] text-[#b91c1c]",
  gray: "bg-[#f3f4f6] text-[#6b7280]",
}

/** Small pill label; tone drives the color pair. */
export function GrantPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone]
      )}
    >
      {children}
    </span>
  )
}
