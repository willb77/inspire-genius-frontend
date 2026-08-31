// Job DNA vertical — shared UI primitives.
//
// Component-only module so the react-refresh/only-export-components rule stays
// satisfied. These give every Job DNA tool page the same light-theme header,
// card chrome, and loading / empty / error states. Accent is the vertical's
// registered violet (#7C3AED), kept distinct from GRANT's blue.

import type { LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"
import { AlertTriangle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { JobDNA } from "@/types/job-blueprint"

/**
 * Job DNA picker driven by a caller-supplied list (the caller owns the
 * `useJobDnaList` read so loading/error states stay in one place).
 */
export function JobDnaSelect({
  jobDnas,
  value,
  onChange,
  label = "Job DNA",
}: {
  jobDnas: JobDNA[]
  value: string
  onChange: (id: string) => void
  label?: string
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-[#374151]">
      <span className="font-medium">{label}:</span>
      <select
        className="h-9 min-w-56 rounded-md border border-input bg-transparent px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select a role…</option>
        {jobDnas.map((jd) => (
          <option key={jd.id} value={jd.id}>
            {jd.roleTitle} — {jd.department}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Standard page header: icon chip + title + subtitle, with an optional action slot. */
export function JobDnaPageHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(124,58,237,0.1)]">
            <Icon className="h-5 w-5 text-[#7C3AED]" />
          </div>
          <h1 className="text-2xl font-semibold text-[#1f2937]">{title}</h1>
        </div>
        <p className="text-[#6b7280]">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** White surface card with the shared border + radius. */
export function JobDnaCardSurface({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("rounded-xl border border-[#e5e7eb] bg-white p-5", className)}>
      {children}
    </div>
  )
}

/** Primary accent button-styled link. */
export function JobDnaLinkButton({
  to,
  children,
  className,
}: {
  to: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-[#7C3AED] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6D28D9]",
        className
      )}
    >
      {children}
    </Link>
  )
}

/** Dashed empty-state panel used when a tool has no data yet. */
export function JobDnaEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-white p-10 text-center text-[#9ca3af]">
      {children}
    </div>
  )
}

/** Centered spinner used while a live endpoint read is in flight. */
export function JobDnaLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white p-10 text-sm text-[#6b7280]">
      <Loader2 className="h-4 w-4 animate-spin text-[#7C3AED]" />
      {label}
    </div>
  )
}

/** Inline error panel with an optional retry action. */
export function JobDnaError({
  message = "Something went wrong loading this data.",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] p-4 text-sm text-[#b91c1c]">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
      {onRetry ? (
        <button onClick={onRetry} className="ml-1 underline text-[#7C3AED]">
          Retry
        </button>
      ) : null}
    </div>
  )
}
