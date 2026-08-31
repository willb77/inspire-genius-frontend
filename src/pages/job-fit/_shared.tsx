// Job-Fit vertical — shared UI primitives.
//
// Component-only module (pure helpers live in ./_fit) so react-refresh stays
// satisfied. Teal accent (#0D9488) distinguishes Job-Fit from GRANT (#3B5BFF)
// and Job-Blueprint (#7C3AED). Reuses Core's AppShell chrome via VerticalShell.

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tone } from "./_fit"

/**
 * Standard page header: icon chip + title + subtitle.
 *
 * Deliberately pure — no data, no routing. The vertical's navigation lives in
 * `FitShell` (a pathless layout route) rather than here: an earlier attempt put
 * it in this component and broke every page test, because a presentational
 * header suddenly required auth and entitlement context.
 */
export function FitPageHeader({
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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(13,148,136,0.1)]">
          <Icon className="h-5 w-5 text-[#0D9488]" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1f2937]">{title}</h1>
      </div>
      <p className="text-[#6b7280]">{description}</p>
    </div>
  )
}

/** White surface card with the shared border + radius. */
export function FitCard({
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
export function FitEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#e5e7eb] bg-white p-10 text-center text-[#9ca3af]">
      {children}
    </div>
  )
}

const TONE_CLASSES: Record<Tone, string> = {
  teal: "bg-[rgba(13,148,136,0.12)] text-[#0f766e]",
  green: "bg-[rgba(34,197,94,0.12)] text-[#15803d]",
  amber: "bg-[rgba(245,158,11,0.14)] text-[#b45309]",
  red: "bg-[rgba(239,68,68,0.12)] text-[#b91c1c]",
  gray: "bg-[#f3f4f6] text-[#6b7280]",
}

const BAR_CLASSES: Record<Tone, string> = {
  teal: "bg-[#0D9488]",
  green: "bg-[#22c55e]",
  amber: "bg-[#f59e0b]",
  red: "bg-[#ef4444]",
  gray: "bg-[#9ca3af]",
}

/** Small pill label; tone drives the color pair. */
export function FitPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
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

/** A labeled progress meter (0–100). */
export function FitMeter({
  value,
  tone = "teal",
  label,
  right,
  className,
}: {
  value: number
  tone?: Tone
  label?: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={className}>
      {(label || right) && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-[#374151]">{label}</span>
          <span className="font-semibold text-[#1f2937]">{right}</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#eef1f4]">
        <div className={cn("h-full rounded-full transition-all", BAR_CLASSES[tone])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** A compact metric tile: icon chip + label + big value + optional hint. */
export function FitStat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "teal",
}: {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  tone?: Tone
}) {
  return (
    <section className="rounded-xl border border-[#e5e7eb] bg-white p-5">
      <div className="mb-2 flex items-center gap-2 text-[#374151]">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", TONE_CLASSES[tone])}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-sm font-semibold">{label}</h2>
      </div>
      <p className="text-3xl font-bold text-[#1f2937]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#9ca3af]">{hint}</p>}
    </section>
  )
}

/** Section heading with an optional right-aligned action/slot. */
export function FitSectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">{children}</h2>
      {action}
    </div>
  )
}

/**
 * Not-a-hiring-decision disclaimer. Rendered wherever fit is shown so the tool
 * never reads as making an employment decision about the user.
 */
export function FitMethodologyNote({ note }: { note?: string }) {
  return (
    <p className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3 text-xs leading-relaxed text-[#6b7280]">
      {note ??
        "This is a self-guided development aid, not a hiring decision. It compares your behavioral profile to a role's published benchmark to help you focus your growth and interview prep."}
    </p>
  )
}

/** Full-page loading placeholder. */
export function FitLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-[#e5e7eb] bg-white p-10 text-sm text-[#9ca3af]">
      {label}
    </div>
  )
}

/** Inline error panel. */
export function FitError({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)] p-5 text-sm text-[#b91c1c]">
      {children}
    </div>
  )
}
