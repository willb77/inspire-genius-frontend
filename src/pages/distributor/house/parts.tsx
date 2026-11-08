import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { DASH } from "./distributorData"

/** One figure. A missing figure shows "—" and says so, rather than a made-up number. */
export function StatTile({
  label,
  value,
  loading,
}: {
  label: string
  /** Already formatted; DASH when there is no real figure. */
  value: string
  loading?: boolean
}) {
  const missing = value === DASH
  return (
    <div className="rounded-lg border border-border bg-card p-4" data-testid={`stat-${label}`}>
      <div className="text-sm text-muted-foreground">{label}</div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20 bg-muted" />
      ) : (
        <>
          <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
          {missing && <div className="text-xs text-muted-foreground">Not available yet</div>}
        </>
      )}
    </div>
  )
}

/** A titled section on a theme-token card. */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-4", className)} aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
